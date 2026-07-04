import type { HabitLog } from '@/features/habits/hooks/useTodayLogs';
import { dateOnly } from '@/utils/date';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// month = 'YYYY-MM'
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate(); // dia 0 do mês seguinte = último dia
  const firstWeekday = new Date(y, m - 1, 1).getDay(); // 0=Dom..6=Sáb
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    year: y,
    month: m,
    start: `${month}-01`,
    end: `${month}-${pad(daysInMonth)}`,
    daysInMonth,
    firstWeekday,
    dayStr: (d: number) => `${month}-${pad(d)}`,
  };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export type DayAgg = {
  date: string;
  success: number;
  fail: number;
  xp: number;
  gold: number;
  damage: number;
};

export type DayStatus = 'none' | 'good' | 'bad';

export function aggregateByDay(logs: HabitLog[] | undefined): Record<string, DayAgg> {
  const map: Record<string, DayAgg> = {};
  for (const l of logs ?? []) {
    const day = dateOnly(l.occurred_on);
    const a = (map[day] ??= {
      date: day,
      success: 0,
      fail: 0,
      xp: 0,
      gold: 0,
      damage: 0,
    });
    if (l.success) a.success += 1;
    else a.fail += 1;
    a.xp += l.xp_gained;
    a.gold += l.gold_gained;
    a.damage += l.damage_taken;
  }
  return map;
}

export function dayStatus(agg: DayAgg | undefined): DayStatus {
  if (!agg) return 'none';
  if (agg.damage > 0 || agg.fail > 0) return 'bad';
  if (agg.success > 0) return 'good';
  return 'none';
}

export function monthSummary(byDay: Record<string, DayAgg>, daysInMonth: number) {
  const days = Object.values(byDay);
  const daysWithCheckin = days.filter((d) => d.success > 0).length;
  const totalCheckins = days.reduce((s, d) => s + d.success, 0);
  const checkinRate = daysInMonth > 0 ? Math.round((daysWithCheckin / daysInMonth) * 1000) / 10 : 0;
  return { daysWithCheckin, totalCheckins, checkinRate };
}
