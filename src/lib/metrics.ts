export function calculateEwma(
  previousEwma: number,
  currentValue: number,
  alpha: number,
): number {
  return alpha * currentValue + (1 - alpha) * previousEwma;
}
