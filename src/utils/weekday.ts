// Convenção do backend: 0=Dom .. 6=Sáb.
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const WEEKDAY_LONG = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];

export function formatWeekdays(days: number[] | null | undefined): string {
  const d = (days ?? []).slice().sort((a, b) => a - b);
  if (d.length === 0) return '—';
  if (d.length === 7) return 'Todo dia';
  if (d.length === 5 && WEEKDAYS_MON_FRI.every((x) => d.includes(x))) return 'Dias úteis';
  return d.map((x) => WEEKDAY_SHORT[x]).join(', ');
}
