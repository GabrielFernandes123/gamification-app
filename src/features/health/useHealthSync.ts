import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { apiFetch } from '@/lib/api';

import {
  isHealthKitAvailable,
  readSleepSessions,
  requestHealthPermissions,
} from './ios/healthkit';

/**
 * Sincroniza o sono ao abrir o app.
 *
 * Espelha `features/tracking/ios/useShieldSync` — mesmo formato de runner no
 * layout raiz, mesma deduplicação de chamadas concorrentes. É de propósito:
 * duas rotinas de background com desenhos diferentes seriam duas fontes de bug.
 *
 * Não há background delivery: o HealthKit é lido quando o app abre e quando
 * volta ao primeiro plano. É suficiente porque o dado é de NOITE — não existe
 * urgência de meio-dia, e ficar acordando o app custa bateria por nada.
 */

/**
 * Janela de busca. Sete dias cobre viagem, celular sem bateria e app fechado a
 * semana toda — e o custo de reenviar noites já importadas é zero, porque o
 * backend deduplica pelo `externalId`.
 */
const LOOKBACK_DAYS = 7;

export type SleepSyncResult = {
  imported: number;
  duplicates: number;
  skipped: number;
};

let inFlight: Promise<SleepSyncResult | null> | null = null;
let lastResult: SleepSyncResult | null = null;

export async function syncSleepOnce(): Promise<SleepSyncResult | null> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!isHealthKitAvailable()) return null;

    const granted = await requestHealthPermissions();
    if (!granted) return null;

    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
    const sessions = await readSleepSessions(since);
    if (sessions.length === 0) return null;

    const result = await apiFetch<SleepSyncResult>('/sleep/sessions', {
      method: 'POST',
      body: { sessions },
    });
    lastResult = result;
    return result;
  })()
    .catch(() => null) // best-effort: sono é bônus, não pode derrubar a abertura
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function getLastSleepSync(): SleepSyncResult | null {
  return lastResult;
}

/** Use no layout raiz, ao lado do `useShieldSyncRunner`. */
export function useHealthSyncRunner(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') return;
    void syncSleepOnce();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncSleepOnce();
    });
    return () => subscription.remove();
  }, [enabled]);
}
