import dotenv from 'dotenv';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { SSMClient } from '@aws-sdk/client-ssm';
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime';
import { createEmbeddingsClient } from '../src/database/embeddings';
import { loadDeployedRetrievalConfig } from '../src/config/retrieval';
import { createBedrockReranker } from '../src/questions/adapters/bedrock-reranker';
import { createContextRetriever, type RetrievalResult } from '../src/questions/retrieval';
import { evaluateRanking } from './benchmark-metrics';

type Gold = { heading: string; pages: number[]; relevance: number };
type Fixture = { version: number; source: { document_key: string }; items: { id: string; query: string; natural_query: string; expected_chunks: Gold[] }[] };
const pageKey = (pages: number[]) => [...pages].sort((a, b) => a - b).join(',');
// Only accept the known OCR ambiguity at the beginning of a heading, with equal pages.
const headingKey = (heading: string) => heading.replace(/^[0O](?=\s)/, 'O');
const key = (heading: string, pages: number[]) => JSON.stringify([headingKey(heading), pageKey(pages)]);

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--query-style' || !['detailed', 'natural'].includes(args[1]))) {
    throw new Error('Usage: benchmark:retrieval [--query-style detailed|natural]');
  }
  const queryStyle = args[1] ?? 'detailed';
  dotenv.config({ path: resolve(__dirname, '../.env'), quiet: true } as dotenv.DotenvConfigOptions);
  const requireEnv = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing ${name}`);
    return value;
  };
  const fixture: Fixture = JSON.parse(await readFile(resolve(__dirname, '../../docs/benchmarks/as-filosofias-politicas-reranking.json'), 'utf8'));
  const awsConfig = {
    region: process.env.AWS_REGION,
    ...(process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY ? {
      credentials: { accessKeyId: process.env.AWS_ACCESS_KEY, secretAccessKey: process.env.AWS_SECRET_KEY },
    } : {}),
    maxAttempts: 1,
  };
  const ssm = new SSMClient(awsConfig);
  const config = await loadDeployedRetrievalConfig(ssm, process.env.SSM_PARAMETER_PATH || '/test-platform/dev');
  const bedrock = new BedrockAgentRuntimeClient({ ...awsConfig, region: config.region });
  const reranker = createBedrockReranker(bedrock, config.modelArn);
  const openai = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY'), maxRetries: 0, timeout: 30_000 });
  const sql = createEmbeddingsClient(requireEnv('EMBEDDINGS_DATABASE_URL'));
  const outputDir = resolve(__dirname, '../../docs/benchmarks/results');
  await mkdir(outputDir, { recursive: true });
  const report: any = {
    fixtureVersion: fixture.version, queryStyle,
    startedAt: new Date().toISOString(), document: fixture.source.document_key,
    modelArn: config.modelArn, options: config.options,
    rerankEnabledInApplication: config.enabled,
    note: 'Reranking is explicitly exercised for comparison, even if disabled in the application. Metrics use delivered parents after deduplication and context budget.',
    headingAliases: [], items: [],
  };
  const outputPath = resolve(outputDir, `as-filosofias-politicas-${queryStyle}-${Date.now()}.json`);
  try {
    const parents = await sql`SELECT id, heading, pages FROM embedding_parents WHERE document = ${fixture.source.document_key}`;
    for (const item of fixture.items) {
      for (const expected of item.expected_chunks) {
        const matches = parents.filter((parent) => key(parent.heading ?? '', parent.pages) === key(expected.heading, expected.pages));
        if (matches.length !== 1) throw new Error(`${item.id}: expected chunk ${expected.heading} [${expected.pages}] resolves to ${matches.length} parents`);
        if (matches[0].heading !== expected.heading && !report.headingAliases.some((alias: any) => alias.expected === expected.heading)) {
          report.headingAliases.push({ expected: expected.heading, actual: matches[0].heading, pages: expected.pages });
        }
      }
    }
    console.log(`Validated ${parents.length} parents; running ${fixture.items.length} queries with ${config.options.candidateLimit} candidates.`);
    for (const item of fixture.items) {
      const query = queryStyle === 'natural' ? item.natural_query : item.query;
      if (!query) throw new Error(`${item.id}: missing ${queryStyle} query`);
      let candidates: any[] | undefined;
      let embedding: any;
      let fallback: string | undefined;
      let rerankLatencyMs = 0;
      let ranking: any[] = [];
      const cachedOpenai = { embeddings: { create: async (request: any) => embedding ??= await openai.embeddings.create(request) } };
      const cachedSql = async (strings: TemplateStringsArray, ...values: any[]) => candidates ??= [...await sql(strings, ...values)];
      const common = { openaiClient: cachedOpenai as any, sqlClient: cachedSql, retrievalOptions: config.options };
      const baseline = createContextRetriever(common);
      const treatment = createContextRetriever({
        ...common,
        reranker: { rerank: async (request) => {
          const start = performance.now();
          try { ranking = await reranker.rerank(request); return ranking; }
          finally { rerankLatencyMs = performance.now() - start; }
        } },
        onRerankFallback: (error) => { fallback = error instanceof Error ? error.message : String(error); },
      });
      const start = performance.now();
      const vector = await baseline([fixture.source.document_key], query);
      const retrievalLatencyMs = performance.now() - start;
      const reranked = await treatment([fixture.source.document_key], query);
      const gold = new Map(item.expected_chunks.map((expected) => [key(expected.heading, expected.pages), expected.relevance]));
      const score = (result: RetrievalResult) => {
        const retrieved = result.references.map((reference) => ({
          heading: reference.title, pages: reference.pages,
          relevance: gold.get(key(reference.title ?? '', reference.pages)) ?? 0,
        }));
        return { retrieved, metrics: evaluateRanking(retrieved.map((r) => r.relevance), item.expected_chunks.map((e) => e.relevance)) };
      };
      const candidateKeys = new Set(candidates!.map((candidate) => key(candidate.parent_heading ?? '', candidate.parent_pages ?? candidate.pages ?? [])));
      report.items.push({
        id: item.id, query, candidateCount: candidates!.length,
        candidateRecall: item.expected_chunks.filter((expected) => candidateKeys.has(key(expected.heading, expected.pages))).length / item.expected_chunks.length,
        retrievalLatencyMs, rerankLatencyMs, fallback: fallback ?? null,
        vector: score(vector), reranked: score(reranked),
        candidates: candidates!.map((candidate, index) => ({ index, heading: candidate.parent_heading, pages: candidate.parent_pages, distance: candidate.distance, content: candidate.content })),
        ranking,
      });
      await writeFile(outputPath, JSON.stringify(report, null, 2));
      console.log(`${item.id}: vector nDCG=${score(vector).metrics.ndcgAt5.toFixed(3)}; rerank nDCG=${score(reranked).metrics.ndcgAt5.toFixed(3)}${fallback ? `; FALLBACK: ${fallback}` : ''}`);
      // Provider failures invalidate the comparison; avoid repeated paid failures.
      if (fallback) throw new Error(`${item.id}: reranking fell back; comparison is incomplete`);
    }
    const average = (getValue: (item: any) => number) => report.items.reduce((sum: number, item: any) => sum + getValue(item), 0) / report.items.length;
    report.summary = {
      queries: report.items.length, candidateRecall: average((i) => i.candidateRecall),
      vector: Object.fromEntries(['recallAt5', 'mrr', 'ndcgAt5'].map((metric) => [metric, average((i) => i.vector.metrics[metric])])),
      reranked: Object.fromEntries(['recallAt5', 'mrr', 'ndcgAt5'].map((metric) => [metric, average((i) => i.reranked.metrics[metric])])),
      meanRerankLatencyMs: average((i) => i.rerankLatencyMs),
    };
    report.status = 'complete';
    console.log(JSON.stringify(report.summary, null, 2));
  } catch (error) {
    report.status = 'incomplete';
    report.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    await writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report: ${outputPath}`);
    await sql.end();
    bedrock.destroy();
    ssm.destroy();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
