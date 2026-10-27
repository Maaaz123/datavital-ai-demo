import dayjs from 'dayjs';

export function formatDateTime(value: unknown): string {
  if (!value) return '—';
  const d = dayjs(String(value));
  return d.isValid() ? d.format('DD MMM YYYY, HH:mm') : String(value);
}

export function formatDate(value: unknown): string {
  if (!value) return '—';
  const d = dayjs(String(value));
  return d.isValid() ? d.format('DD MMM YYYY') : String(value);
}

export function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : new Intl.NumberFormat().format(num);
}

export function formatCurrency(value: unknown, currency = 'SAR'): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(num);
}

export function formatMinutes(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : `${Math.round(num)} min`;
}

export function formatHours(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : `${num.toFixed(1)} hrs`;
}

export function formatDays(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : `${num.toFixed(1)} days`;
}

export function fallback(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
