import type { Block, GetDocumentAnalysisCommandOutput } from "@aws-sdk/client-textract";

export type FetchTextractPage = (
  jobId: string,
  nextToken?: string,
) => Promise<GetDocumentAnalysisCommandOutput>;

export function createTextractResultLoader(fetchPage: FetchTextractPage) {
  return async (jobId: string): Promise<Block[]> => {
    const blocks: Block[] = [];
    const seenTokens = new Set<string>();
    let nextToken: string | undefined;

    do {
      const result = await fetchPage(jobId, nextToken);
      blocks.push(...(result.Blocks ?? []));

      nextToken = result.NextToken || undefined;
      if (nextToken && seenTokens.has(nextToken)) {
        throw new Error(`Textract returned a repeated pagination token for job ${jobId}`);
      }
      if (nextToken) seenTokens.add(nextToken);
    } while (nextToken);

    return blocks;
  };
}
