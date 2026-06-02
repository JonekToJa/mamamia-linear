export function topPosition(siblings: { position: number }[]): number {
  if (siblings.length === 0) return 1;
  const min = Math.min(...siblings.map((s) => s.position));
  return min - 1;
}

export function bottomPosition(siblings: { position: number }[]): number {
  if (siblings.length === 0) return 1;
  const max = Math.max(...siblings.map((s) => s.position));
  return max + 1;
}

export function betweenPosition(prev: number, next: number): number {
  return (prev + next) / 2;
}
