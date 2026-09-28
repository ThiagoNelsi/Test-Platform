export function evaluateRanking(grades: number[], expectedGrades: number[], k = 5) {
  const gain = (grade: number, rank: number) => (2 ** grade - 1) / Math.log2(rank + 2);
  const dcg = grades.slice(0, k).reduce((sum, grade, rank) => sum + gain(grade, rank), 0);
  const ideal = [...expectedGrades].sort((a, b) => b - a).slice(0, k)
    .reduce((sum, grade, rank) => sum + gain(grade, rank), 0);
  const firstPrimary = grades.findIndex((grade) => grade === 3);
  return {
    recallAt5: grades.slice(0, k).filter((grade) => grade >= 2).length / expectedGrades.length,
    mrr: firstPrimary < 0 ? 0 : 1 / (firstPrimary + 1),
    ndcgAt5: ideal ? dcg / ideal : 0,
  };
}
