import { describe, expect, it } from 'vitest';
import { evaluateRanking } from '../../scripts/benchmark-metrics';

describe('benchmark ranking metrics', () => {
  it('scores an ideal ranking as one', () => {
    expect(evaluateRanking([3, 3, 2, 0], [3, 2, 3])).toEqual({ recallAt5: 1, mrr: 1, ndcgAt5: 1 });
  });
  it('penalizes missing and late evidence, using primary evidence for MRR', () => {
    const result = evaluateRanking([2, 0, 3, 0, 0, 3], [3, 3, 2]);
    expect(result.recallAt5).toBeCloseTo(2 / 3);
    expect(result.mrr).toBeCloseTo(1 / 3);
    expect(result.ndcgAt5).toBeCloseTo((3 + 7 / 2) / (7 + 7 / Math.log2(3) + 3 / 2));
    expect(evaluateRanking([], [3, 2])).toEqual({ recallAt5: 0, mrr: 0, ndcgAt5: 0 });
  });
});
