// Espelha a fórmula do backend: level = floor(sqrt(totalXp/100)) + 1.
// O nível L começa em 100*(L-1)^2 de XP; o próximo em 100*L^2.

export function levelProgress(totalXp: number, level: number) {
  const start = 100 * (level - 1) ** 2;
  const next = 100 * level ** 2;
  const span = next - start;
  const into = totalXp - start;
  return {
    into,
    span,
    ratio: span > 0 ? Math.max(0, Math.min(1, into / span)) : 0,
    xpForNext: next,
  };
}

export function initialsFromName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
