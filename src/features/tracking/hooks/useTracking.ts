import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

// Espelho dos hooks do web (gamificacao-web/src/features/tracking/useTracking.ts).
// Convenção do app: toasts são disparados NA TELA (onSuccess/onError do mutate).

export type ChargeMode = 'active' | 'parallel' | 'all';

/** Quem mede a fonte no iPhone: automações do Atalhos ou a extension nativa. */
export type IosMeasure = 'shortcuts' | 'device_activity';

export type TrackedSource = {
  id: string;
  kind: 'domain' | 'app';
  matcher: string;
  label: string;
  daily_free_seconds: number;
  gold_per_hour: number;
  boss_threshold_seconds: number | null; // zona 3; null = nunca alimenta o boss
  block_after_seconds: number | null; // zona 4; null = nunca bloqueia
  unlock_cost_gold: number;
  unlock_minutes: number;
  charge_mode: ChargeMode; // o que é cobrado: foco / +2º monitor / tudo
  ios_measure: IosMeasure;
  icon_url: string | null; // ícone enviado por dispositivo (apps); sites usam favicon
  is_active: boolean;
  created_at: string;
};

export type SourcePayload = {
  kind: 'domain' | 'app';
  matcher: string;
  label: string;
  daily_free_seconds: number;
  gold_per_hour: number;
  boss_threshold_seconds?: number; // 0 = desligar
  block_after_seconds?: number; // 0 = desligar
  unlock_cost_gold?: number;
  unlock_minutes?: number;
  charge_mode?: ChargeMode;
  ios_measure?: IosMeasure;
  is_active?: boolean;
};

export type TrackingSummary = {
  date: string;
  totals: {
    seconds: number;
    parallel_seconds: number;
    audio_seconds: number;
    gold_charged: number;
    boss_feed_seconds: number;
  };
  sources: Array<{
    kind: 'domain' | 'app';
    matcher: string;
    label: string;
    icon_url: string | null;
    seconds: number;
    parallel_seconds: number;
    audio_seconds: number;
    counted_seconds: number;
    charge_mode: ChargeMode;
    gold_charged: number;
    is_tracked: boolean;
    daily_free_seconds: number | null;
    free_remaining: number | null;
    gold_per_hour: number | null;
    boss_threshold_seconds: number | null;
    boss_feed_seconds: number;
    settled: boolean;
  }>;
};

export type TrackedDevice = {
  id: string;
  name: string;
  platform: 'extension' | 'desktop' | 'iphone';
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type PairingCode = { code: string; expires_at: string };

export type DayMode = 'tranquilo' | 'pesado';

export type DayMarks = {
  today: string;
  today_mode: DayMode | null;
  marks: Array<{ day: string; mode: DayMode; note: string | null }>;
};

export function useTrackingSources() {
  return useQuery({
    queryKey: qk.trackingSources,
    queryFn: () => apiFetch<TrackedSource[]>('/tracking/sources'),
  });
}

export function useTrackingSummary(date: string) {
  return useQuery({
    queryKey: qk.trackingSummary(date),
    refetchInterval: 60 * 1000, // custo ao vivo enquanto a tela está aberta
    queryFn: () => apiFetch<TrackingSummary>(`/tracking/summary?date=${date}`),
  });
}

export function useTrackedDevices() {
  return useQuery({
    queryKey: qk.trackingDevices,
    queryFn: () => apiFetch<TrackedDevice[]>('/tracking/devices'),
  });
}

function useInvalidateTracking() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.trackingSources });
    void qc.invalidateQueries({ queryKey: ['trackingSummary'] });
  };
}

export function useCreateSource() {
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: (payload: SourcePayload) =>
      apiFetch<TrackedSource>('/tracking/sources', { method: 'POST', body: payload }),
    onSuccess: invalidate,
  });
}

export function useUpdateSource() {
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<SourcePayload> & { id: string }) =>
      apiFetch<TrackedSource>(`/tracking/sources/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: invalidate,
  });
}

export function useDeleteSource() {
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/tracking/sources/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useGeneratePairCode() {
  return useMutation({
    mutationFn: () => apiFetch<PairingCode>('/tracking/pairing-codes', { method: 'POST' }),
  });
}

export function useRevokeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ revoked: boolean }>(`/tracking/devices/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.trackingDevices }),
  });
}

/**
 * Marca do dia (tranquilo/pesado): a única configuração de exigência por dia
 * que vive no app — o resto se configura no web. Afeta limites de tela E a
 * meta de XP que o boss cobra.
 */
export function useDayMarks() {
  return useQuery({
    queryKey: qk.trackingDayMarks,
    queryFn: () => apiFetch<DayMarks>('/tracking/day-marks'),
  });
}

export function useMarkDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: DayMode | null) =>
      apiFetch<{ day: string; mode: DayMode | null }>('/tracking/day-marks', {
        method: 'PUT',
        body: { mode },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.trackingDayMarks });
      void qc.invalidateQueries({ queryKey: ['trackingSummary'] });
    },
  });
}

/** Favicon de um domínio via serviço público (mesma fonte do web). */
export function faviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/** URL de ícone da fonte: app usa o enviado pelo desktop, site usa favicon. */
export function sourceIconUrl(
  kind: 'domain' | 'app',
  matcher: string,
  iconUrl?: string | null,
): string | null {
  return iconUrl ?? (kind === 'domain' ? faviconUrl(matcher) : null);
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min`;
  return `${totalSeconds}s`;
}
