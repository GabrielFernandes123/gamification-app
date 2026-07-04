import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { DailySummary } from '@/types/rpc';

export function useDailySummary() {
  const qc = useQueryClient();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const firedRef = useRef(false); // evita POST duplicado por remount/StrictMode

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    let active = true;
    apiFetch<DailySummary>('/habits/daily-summary', { method: 'POST' })
      .then((s) => {
        if (!active) return;
        if (s.events && s.events.length > 0) {
          setSummary(s);
          // Dias fechados/dano/streak afetam personagem, hábitos e logs de período.
          qc.invalidateQueries({ queryKey: qk.character });
          qc.invalidateQueries({ queryKey: qk.habits });
          qc.invalidateQueries({ queryKey: ['periodLogs'] });
        }
      })
      .catch(() => {
        // Informativo: não bloqueia a abertura do app.
      });
    return () => {
      active = false;
    };
  }, [qc]);

  return { summary, dismiss: () => setSummary(null) };
}
