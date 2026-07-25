import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

// Espelho dos hooks do web (gamificacao-web/src/features/tracking/useTracking.ts).
// Convenção do app: toasts são disparados NA TELA (onSuccess/onError do mutate).

export type TrackedSource = {
  id: string;
  kind: 'domain' | 'app';
  matcher: string;
  label: string;
  daily_free_seconds: number;
  gold_per_hour: number;
  boss_threshold_seconds: number | null; // zona 3; null = nunca alimenta o boss
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
  is_active?: boolean;
};

export type TrackingSummary = {
  date: string;
  totals: { seconds: number; gold_charged: number; boss_feed_seconds: number };
  sources: Array<{
    kind: 'domain' | 'app';
    matcher: string;
    label: string;
    seconds: number;
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

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min`;
  return `${totalSeconds}s`;
}
