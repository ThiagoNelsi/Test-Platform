export const levels = [
  "Fácil",
  "Médio",
  "Difícil",
] as const;

export const getLevel = (level: number) => {
  if (level == null || level < 0) {
    return "Não definido"
  }

  return levels[Number(level)] || "Não definido"
}
