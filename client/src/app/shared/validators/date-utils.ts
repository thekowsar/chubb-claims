/** Local calendar date as YYYY-MM-DD (the API's `format: date`). */
export function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value.length >= 10 ? value.substring(0, 10) : value;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses YYYY-MM-DD as a local date (not UTC midnight), so the datepicker shows the same day. */
export function fromIsoDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}
