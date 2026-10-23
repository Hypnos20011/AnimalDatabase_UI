export function formatNumber(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  return String(Math.sign(value) < 0 ? -rounded : rounded);
}

export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: string,
  decimals = 1,
): string {
  const hasMin = min !== null && min !== undefined && !Number.isNaN(Number(min));
  const hasMax = max !== null && max !== undefined && !Number.isNaN(Number(max));
  const low = hasMin ? formatNumber(Number(min), decimals) : '';
  const high = hasMax ? formatNumber(Number(max), decimals) : '';

  if (hasMin && hasMax) {
    return low === high ? `${low} ${unit}` : `${low}–${high} ${unit}`;
  }
  if (hasMax) {
    return `up to ${high} ${unit}`;
  }
  if (hasMin) {
    return `at least ${low} ${unit}`;
  }
  return '';
}
