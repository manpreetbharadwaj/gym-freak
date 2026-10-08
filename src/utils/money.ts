import type { Discount } from '../types/domain';

/** Decimal places of a currency's minor unit per ISO 4217 (USD 2, JPY 0, KWD 3). */
export function minorDigits(currency: string) {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2; }
  catch { return 2; }
}

/** Server minor units (cents / pence / paise / yen) → localised money. Display only: amounts are never computed here. */
export function formatMoney(minor: number, currency: string, locale?: string) {
  const digits = minorDigits(currency);
  const major = minor / 10 ** digits;
  // Whole amounts drop the decimals (₹999, not ₹999.00); anything else keeps the currency's own precision.
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: Number.isInteger(major) ? 0 : digits, maximumFractionDigits: digits }).format(major); }
  catch { return `${currency} ${major.toFixed(digits)}`; }
}

/** “20%” or “₹100”, exactly as the server defined the discount (fixed amounts need the server's currency). */
export const discountLabel = (d: Discount, currency: string | null, locale?: string) =>
  d.discountType === 'PERCENTAGE' ? `${d.discountValue}%` : currency ? formatMoney(d.discountValue, currency, locale) : String(d.discountValue);
