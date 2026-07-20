// "Hoje" no timezone do usuário (não do device) — evita off-by-one.
// Usa Intl (Hermes suporta) com fallback para a data local.
export function todayInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      // tz vazio => fuso do aparelho (não force um fuso fixo aqui).
      timeZone: tz || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return localDateOnly();
  }
}

/** 'YYYY-MM-DD' no fuso do aparelho. Nunca use toISOString() aqui: ele dá a
 *  data em UTC, que a oeste de Greenwich já é o dia seguinte à noite. */
function localDateOnly(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// 0=Dom .. 6=Sáb no fuso do usuário.
export function weekdayInTz(tz: string): number {
  try {
    const wd = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || undefined,
      weekday: 'short',
    }).format(new Date());
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
  } catch {
    return new Date().getDay();
  }
}

/** Defesa contra occurred_on vir como ISO datetime: garante 'YYYY-MM-DD'. */
export function dateOnly(s: string): string {
  return s.slice(0, 10);
}

export function normalizeDateOnly(value: string | null | undefined): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(year, month, 0).getDate()
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function formatDateOnly(value: string | null | undefined, options?: { year?: boolean }): string {
  const date = normalizeDateOnly(value);
  if (!date) return '';

  const [year, month, day] = date.split('-');
  return options?.year ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function isDateOnlyBefore(value: string | null | undefined, comparison: string): boolean {
  const date = normalizeDateOnly(value);
  const comparisonDate = normalizeDateOnly(comparison);
  return date != null && comparisonDate != null && date < comparisonDate;
}
