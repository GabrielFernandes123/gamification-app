import { env } from '@/lib/env';
import { clearDeviceToken } from './deviceToken';

/** Espelha o retorno de `GET /tracking/policy` (PolicyService da API). */
export type PolicySource = {
  kind: 'domain' | 'app';
  matcher: string;
  label: string;
  seconds_today: number;
  charge_mode: 'active' | 'parallel' | 'all';
  daily_free_seconds: number;
  gold_per_hour: number;
  boss_threshold_seconds: number | null;
  block_after_seconds: number | null;
  unlock_cost_gold: number;
  unlock_minutes: number;
  /** Quem mede esta fonte no iPhone (ver EventsService/ios_measure na API). */
  ios_measure: 'shortcuts' | 'device_activity';
  /** Preço da PRÓXIMA liberação, já com a escalada do dia. Use este, não o base. */
  next_unlock_cost: number;
  /** Liberações compradas hoje neste alvo. */
  unlocks_today: number;
  /** Fim do cooldown; null = disponível agora. */
  unlock_available_at: string | null;
};

export type Policy = {
  day: string;
  day_mode: 'tranquilo' | 'pesado' | null;
  gold: number;
  settings: {
    alert_interval_minutes: number;
    notify_charge_start: boolean;
    push_enabled: boolean;
    sabotage_fine_gold: number;
  };
  sources: PolicySource[];
  keywords: {
    id: string;
    phrase: string;
    unlock_cost_gold: number;
    unlock_minutes: number;
    next_unlock_cost: number;
    unlocks_today: number;
    unlock_available_at: string | null;
  }[];
  unlocks: { target_key: string; expires_at: string }[];
  windows?: PolicyWindow[];
  next_boundary_at?: string | null;
  focus?: PolicyFocus | null;
};

export type PolicyWindowSlot = { weekdays: number[]; start_time: string; end_time: string };

export type PolicyWindow = {
  id: string;
  name: string;
  slots: PolicyWindowSlot[];
  /** `kind:matcher` das fontes bloqueadas por esta janela. */
  targets: string[];
  unlock_cost_gold: number;
  unlock_minutes: number;
  active: boolean;
};

export type PolicyFocus = {
  id: string;
  ends_at: string;
  targets: string[];
  abandon_cost_gold: number;
};

export type ProtectionFlags = {
  shield_armed?: boolean;
  screen_time_authorized?: boolean;
  safari_enabled?: boolean;
};

async function deviceFetch<T>(
  token: string,
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${env.API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (response.status === 401) {
    // dispositivo revogado no servidor: o próximo sync cria outro
    await clearDeviceToken();
    throw new Error('Dispositivo não autorizado');
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${path}`);
  }
  return (await response.json()) as T;
}

export function fetchPolicy(token: string): Promise<Policy> {
  return deviceFetch<Policy>(token, '/tracking/policy');
}

/**
 * Estado da proteção. O servidor multa quando isto para de chegar ou vem falso
 * (ProtectionService) — é o que torna caro desligar o shield nos Ajustes.
 * Best-effort: falha aqui nunca pode derrubar o sync.
 */
export async function sendHeartbeat(token: string, flags: ProtectionFlags): Promise<void> {
  try {
    await deviceFetch(token, '/tracking/heartbeat', { method: 'POST', body: flags });
  } catch {
    // silencioso de propósito
  }
}

/**
 * Ingestão de intervalos medidos pelo DeviceActivity. Contrato existente: id
 * gerado no cliente, `seconds` recalculado no servidor, reenvio idempotente.
 */
export async function postIntervals(
  token: string,
  intervals: unknown[],
): Promise<{ accepted: number; duplicates: number } | null> {
  if (intervals.length === 0) return null;
  try {
    return await deviceFetch(token, '/tracking/ingest', {
      method: 'POST',
      body: { intervals },
    });
  } catch {
    // best-effort: o id determinístico faz o próximo sync reenviar sem duplicar
    return null;
  }
}

/** Liberação viva para uma chave (`app:youtube`)? */
export function isUnlocked(policy: Policy, targetKey: string, now = Date.now()): boolean {
  const hit = policy.unlocks.find((u) => u.target_key === targetKey);
  return hit ? new Date(hit.expires_at).getTime() > now : false;
}
