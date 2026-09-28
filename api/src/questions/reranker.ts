export type RankedDocument = {
  /** Zero-based position in the documents supplied to rerank. */
  index: number;
  score: number;
};

/** Providers return a score for every input document; higher means more relevant. */
export interface Reranker {
  rerank(request: {
    query: string;
    documents: readonly string[];
    signal: AbortSignal;
  }): Promise<RankedDocument[]>;
}
