import { useCallback, useEffect, useState } from 'react';
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
 *
 * ── Por que existe um `outcome` e não só um resultado ────────────────────
 * A primeira versão engolia tudo (`catch → null`) e o sono não tinha tela no
 * app. O resultado é que uma chamada inválida ao HealthKit ficou meses sem
 * importar uma noite sequer, e do lado de fora isso era indistinguível de "o
 * relógio não sincronizou". Agora cada rodada guarda POR QUE não importou, e a
 * tela de permissões mostra isso.
 */

/**
 * Janela de busca. Sete dias cobre viagem, celular sem bateria e app fechado a
 * semana toda — e o custo de reenviar noites já importadas é zero, porque o
 * backend deduplica pelo `externalId`.
 */
const LOOKBACK_DAYS = 7;

type ImportResponse = {
  imported: number;
  /** Noites já registradas que o relógio completou depois. */
  revised: number;
  duplicates: number;
  skipped: number;
};

export type SleepSyncOutcome = {
  /** `Date.now()` da rodada — a tela renderiza "há X min". */
  at: number;
  state: 'ok' | 'unavailable' | 'denied' | 'empty' | 'error';
  /** Frase pronta para a interface. Sem jargão de HealthKit. */
  message: string;
  imported: number;
  revised: number;
  duplicates: number;
  skipped: number;
};

let inFlight: Promise<SleepSyncOutcome> | null = null;
let lastOutcome: SleepSyncOutcome | null = null;
const listeners = new Set<(outcome: SleepSyncOutcome) => void>();

function finish(
  state: SleepSyncOutcome['state'],
  message: string,
  counts?: ImportResponse,
): SleepSyncOutcome {
  lastOutcome = {
    at: Date.now(),
    state,
    message,
    imported: counts?.imported ?? 0,
    revised: counts?.revised ?? 0,
    duplicates: counts?.duplicates ?? 0,
    skipped: counts?.skipped ?? 0,
  };
  for (const listener of listeners) listener(lastOutcome);
  return lastOutcome;
}

export async function syncSleepOnce(): Promise<SleepSyncOutcome> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (Platform.OS !== 'ios' || !isHealthKitAvailable()) {
      return finish('unavailable', 'Este aparelho não expõe o app Saúde.');
    }

    const granted = await requestHealthPermissions();
    if (!granted) {
      return finish(
        'denied',
        'O app Saúde não liberou a leitura. Ajustes › Saúde › Acesso a Dados.',
      );
    }

    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
    const sessions = await readSleepSessions(since);
    if (sessions.length === 0) {
      return finish(
        'empty',
        `Nenhuma noite no app Saúde nos últimos ${LOOKBACK_DAYS} dias.`,
      );
    }

    const result = await apiFetch<ImportResponse>('/sleep/sessions', {
      method: 'POST',
      body: { sessions },
    });
    return finish('ok', importMessage(result), result);
  })()
    // Best-effort: sono é bônus e não pode derrubar a abertura do app. Mas o
    // motivo fica guardado — engolir sem registrar foi o bug original.
    .catch((error: unknown) =>
      finish(
        'error',
        `Falha ao ler o sono: ${error instanceof Error ? error.message : String(error)}`,
      ),
    )
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * "Corrigida" é o caso de quem abre o app cedo: a noite entrou pela metade e o
 * relógio completou depois. Vale ser dito — do contrário a recompensa muda
 * sozinha e não há nada na tela que explique por quê.
 */
function importMessage(result: ImportResponse): string {
  const parts: string[] = [];
  if (result.imported > 0) parts.push(`${result.imported} noite(s) importada(s)`);
  if (result.revised > 0) parts.push(`${result.revised} corrigida(s)`);
  return parts.length > 0 ? `${parts.join(', ')}.` : 'Tudo já estava registrado.';
}

export function getLastSleepSync(): SleepSyncOutcome | null {
  return lastOutcome;
}

/** O último resultado, reativo — para a tela de permissões. */
export function useSleepSyncOutcome() {
  const [outcome, setOutcome] = useState<SleepSyncOutcome | null>(lastOutcome);

  useEffect(() => {
    listeners.add(setOutcome);
    return () => {
      listeners.delete(setOutcome);
    };
  }, []);

  const sync = useCallback(async () => {
    await syncSleepOnce();
  }, []);

  return { outcome, sync };
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
