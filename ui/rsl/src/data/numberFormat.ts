const locale = "de-DE";

export function formatNumber(
  n: number,
  options?: Intl.NumberFormatOptions
): string {
  return n.toLocaleString(locale, options);
}

export function formatMiliseconds(n: number): string {
  return formatNumber(n, {
    style: "unit",
    unit: "millisecond",
    maximumFractionDigits: 0,
  });
}
