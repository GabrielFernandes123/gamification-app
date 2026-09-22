import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** Espelha uma linha de `GET /sleep`. */
export type SleepLog = {
  id: string;
  nightOn: string;
  durationMinutes: number;
  source: string;
  /** Já renderizados no fuso que JULGOU a noite — a tela não reformata. */
  bedtimeLocal: string | null;
  wakeLocal: string | null;
  criteriaMet: Record<string, boolean> | null;
  score: number | null;
};

/** Espelha `GET /sleep/summary`. */
export type SleepSummary = {
  nights: number;
  avgMinutes: number | null;
  avgScore: number | null;
  bedtimeMet: number;
  wakeMet: number;
  durationMet: number;
  manual: number;
  daysInPeriod: number;
  coverage: number;
};

/** Espelha `GET /sleep/settings`. */
export type SleepSettings = {
  bedtime_max: string;
  bedtime_enabled: boolean;
  wake_max: string;
  wake_enabled: boolean;
  min_minutes: number;
  min_duration_enabled: boolean;
  difficulty: string;
};

/** AAAA-MM-DD no fuso do aparelho — a API fala em datas, não em instantes. */
function diaLocal(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Janela padrão da tela: as duas últimas semanas. */
export const SLEEP_WINDOW_DAYS = 14;

export function useSleepLogs() {
  const start = diaLocal(-SLEEP_WINDOW_DAYS);
  const end = diaLocal();
  return useQuery({
    queryKey: qk.sleepLogs(start, end),
    queryFn: () => apiFetch<SleepLog[]>(`/sleep?start=${start}&end=${end}`),
  });
}

export function useSleepSummary() {
  const start = diaLocal(-SLEEP_WINDOW_DAYS);
  const end = diaLocal();
  return useQuery({
    // A chave carrega a janela, senão o resumo de ontem sobreviveria à virada
    // do dia — é o mesmo motivo de `qk.sleepLogs` levar start/end.
    queryKey: [...qk.sleepLogs(start, end), 'summary'] as const,
    queryFn: () =>
      apiFetch<SleepSummary>(`/sleep/summary?start=${start}&end=${end}`),
  });
}

export function useSleepSettings() {
  return useQuery({
    queryKey: qk.sleepSettings,
    queryFn: () => apiFetch<SleepSettings>('/sleep/settings'),
  });
}

/** "7h 20min" — a duração é sempre lida, nunca somada de cabeça. */
export function duracaoLonga(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
