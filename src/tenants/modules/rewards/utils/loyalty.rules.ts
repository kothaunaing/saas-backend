export function calculateLoyaltyPoints(
  price: number,
  pointsPerCurrencyUnit: number,
): number {
  if (!Number.isFinite(price) || !Number.isFinite(pointsPerCurrencyUnit))
    return 0;
  return Math.max(0, Math.floor(price * pointsPerCurrencyUnit));
}
