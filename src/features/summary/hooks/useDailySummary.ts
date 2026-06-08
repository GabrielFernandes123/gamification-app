import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { DailySummary } from '@/types/rpc';

export function useDailySummary() {
  const qc = useQueryClient();
  const [summary, setSummary] = useState<DailySummary | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<DailySummary>('/habits/daily-summary', { method: 'POST' })
      .then((s) => {
        if (!active) return;
        if (s.events && s.events.length > 0) {
          setSummary(s);
          qc.invalidateQueries({ queryKey: qk.character });
        }
      })
      .catch(() => {
        // Informativo: nao bloqueia a abertura do app.
      });
    return () => {
      active = false;
    };
  }, [qc]);

  return { summary, dismiss: () => setSummary(null) };
}
