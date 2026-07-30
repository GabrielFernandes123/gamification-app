import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** Espelha `gamificacao-api/src/sleep/sleep.service.ts`. */
export type SleepCriteria = {
  bedtime: boolean | null;
  wake: boolean | null;
  duration: boolean | null;
};

export type SleepLog = {
  id: string;
  nightOn: string;
  bedtime: string;
  wakeTime: string;
  durationMinutes: number;
  source: 'healthkit' | 'manual';
  criteriaMet: SleepCriteria;
};

export function useSleepLogs(start: string, end: string) {
  return useQuery({
    queryKey: qk.sleepLogs(start, end),
    queryFn: () =>
      apiFetch<SleepLog[]>(
        `/sleep?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
  });
}

/** '7h12' — o formato que cabe no radar da Início. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Quantos critérios ativos foram cumpridos — o "3/3" do card. */
export function criteriaScore(criteria: SleepCriteria) {
  const values = Object.values(criteria ?? {}).filter(
    (value): value is boolean => value !== null,
  );
  return { met: values.filter(Boolean).length, active: values.length };
}
