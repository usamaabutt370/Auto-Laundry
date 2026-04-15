export function formatMoney(prefix: string, amount: number): string {
  const fixed = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
  return `${prefix}${fixed}`;
}
