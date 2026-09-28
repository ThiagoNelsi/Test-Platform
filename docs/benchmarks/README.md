# Retrieval and reranking pilot

`as-filosofias-politicas-reranking.json` is a small, manually curated pilot
for comparing retrieval/reranking on one Portuguese textbook chapter. It
contains 13 teacher-style prompts and the parent chunks most expected to
support them.

## Ground-truth keys

The expected chunk key is the exact indexed document key, section heading,
and Textract page numbers. It deliberately does not use parent UUIDs, which
are generated from the ingest document and may change after re-ingestion.
Resolve each expected item against `embedding_parents` by `document` plus
`heading`, then verify its `pages`. The `relevance` grade is an assessor label,
not a model score or a filtering threshold:

- `3`: directly supports the requested topic.
- `2`: useful supporting context.

Chunk headings and page sets were cross-checked against the parent rows
reported for this uploaded PDF. The document is a scan, so its cover/title
page is indexed as PDF page 1 even though the textbook's printed page number
differs. Use the JSON `document_key` to filter retrieval to this upload. A
few headings contain OCR artifacts such as a leading `0` in place of `O` or
missing whitespace; the JSON preserves those strings exactly as they appeared
in the indexed rows so matching stays unambiguous.

## Run a comparison

From the repository root:

```bash
pnpm run benchmark:retrieval
```

To evaluate the 13 shorter teacher-style prompts instead:

```bash
pnpm run benchmark:retrieval --query-style natural
```

The default `detailed` style preserves the original prompts and results.
Fixture version 2 adds a `natural_query` for each item: it preserves the subject
but removes lists of concepts and expected evidence. For example, the Hobbes
prompt becomes “Gere 5 questões sobre o estado de natureza em Hobbes.”
Reports record the fixture version, query style, and actual query.

These shorter requests are authored approximations of teacher requests, not
measured user behavior. They retain the existing gold labels as provisional
expectations. Broader prompts can admit more relevant sections than the current
labels cover; review unexpected retrieved sections before interpreting a lower
score as a failure. The purpose is to measure whether query specificity affects
the comparison, without assuming that reranking should win. Within each style,
vector and reranked retrieval share the same candidates; different query styles
produce different candidate sets.

The runner loads `api/.env` and the same SSM retrieval configuration as the API.
It requires the embeddings database, OpenAI credentials, and AWS permissions for
SSM and Bedrock reranking. It makes paid external calls: one query embedding and
one reranking operation per prompt (pagination can add requests). The database
is read only. Reranking is explicitly exercised even if disabled in the app.

Each question retrieves candidates once, then reuses the exact embedding and
candidate rows for vector-only and reranked retrieval. Parent expansion,
deduplication, the context character budget, and the timeout use the application
implementation. Scores therefore evaluate the parents actually delivered to
generation. MRR is measured over that delivered list, normally at most five
parents. Candidate recall is also recorded to expose misses that reranking cannot
recover.

Expected headings/pages must resolve to exactly one parent before any model call.
The runner accepts only the leading `O`/`0` OCR ambiguity on otherwise identical
headings and pages, and records these aliases. A missing or ambiguous target
aborts execution. A reranking failure also aborts and marks the report incomplete,
so vector fallback cannot be mistaken for a successful Cohere comparison.

Timestamped JSON reports are saved under `docs/benchmarks/results/`, with metrics,
retrieved headings/pages, timings, candidate texts, vector distances, and reranking
scores. Treat those reports as copies of the source material when sharing them.

For each item, send `query` to the same retrieval corpus filtered to
`source.document_key`, and record the retrieved parent heading/page pairs in
rank order. Compare vector-only results with the same candidate set after
Cohere reranking. Keep the candidate limit, prompt, material, and context
budget identical between runs.

Suggested measures:

- **Recall@5:** share of grade-2-or-3 expected chunks found in the first five.
- **MRR:** reciprocal rank of the first grade-3 chunk, averaged over queries.
- **nDCG@5:** ranking quality using the provided relevance grades.

This pilot is a regression/spot-check set, not a statistically representative
benchmark: the questions and labels are hand-authored for one document, and
should be reviewed against retrieved passages when the document is
re-ingested or chunking changes.
