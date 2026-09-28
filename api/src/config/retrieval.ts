import { resolveRetrievalOptions } from '../questions/retrieval';
import { GetParametersCommand, type GetParametersCommandOutput } from '@aws-sdk/client-ssm';

export const retrievalParameterPaths = {
  RERANK_ENABLED: 'rerank/enabled',
  RERANK_REGION: 'rerank/region',
  RERANK_MODEL_ARN: 'rerank/model-arn',
  RERANK_TIMEOUT_MS: 'rerank/timeout-ms',
  RETRIEVAL_CANDIDATE_LIMIT: 'retrieval/candidate-limit',
  RETRIEVAL_MAX_PARENTS: 'retrieval/max-parents',
  RETRIEVAL_MAX_CONTEXT_CHARACTERS: 'retrieval/max-context-characters',
} as const;

export async function loadDeployedRetrievalConfig(
  ssm: { send: (command: GetParametersCommand) => Promise<GetParametersCommandOutput> },
  parameterPath: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const basePath = parameterPath.replace(/\/$/, '');
  const entries = Object.entries(retrievalParameterPaths);
  const names = entries.map(([, path]) => `${basePath}/${path}`);
  const response = await ssm.send(new GetParametersCommand({ Names: names }));
  const values = new Map(response.Parameters?.map(({ Name, Value }) => [Name, Value]));
  const settings: NodeJS.ProcessEnv = { ...env };
  const missing: string[] = [];
  entries.forEach(([key], index) => {
    if (env[key] !== undefined) return;
    const value = values.get(names[index]);
    if (value === undefined) missing.push(names[index]);
    else settings[key] = value;
  });
  // Allow the API to start against older stacks that predate these optional settings.
  if (missing.length) console.warn('Retrieval SSM parameters missing; using defaults', missing);
  return loadRetrievalConfig(settings);
}

export function loadRetrievalConfig(env: NodeJS.ProcessEnv = process.env) {
  const enabled = env.RERANK_ENABLED ?? 'true';
  if (enabled !== 'true' && enabled !== 'false') throw new Error('RERANK_ENABLED must be true or false');
  const region = env.RERANK_REGION || env.AWS_REGION || 'us-east-1';
  return {
    enabled: enabled === 'true',
    region,
    modelArn: env.RERANK_MODEL_ARN || `arn:aws:bedrock:${region}::foundation-model/cohere.rerank-v3-5:0`,
    options: resolveRetrievalOptions({
      candidateLimit: Number(env.RETRIEVAL_CANDIDATE_LIMIT ?? 40),
      maxParents: Number(env.RETRIEVAL_MAX_PARENTS ?? 5),
      maxContextCharacters: Number(env.RETRIEVAL_MAX_CONTEXT_CHARACTERS ?? 14_000),
      rerankTimeoutMs: Number(env.RERANK_TIMEOUT_MS ?? 3_000),
    }),
  };
}
