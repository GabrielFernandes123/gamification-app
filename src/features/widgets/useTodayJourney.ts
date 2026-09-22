import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { apiFetch } from '@/lib/api';

import type { TodayJourneyTimelineEntry } from './todayJourney';
import { writeTodayJourneyTimeline } from './useTodayJourneyWidget';

/**
 * O widget do iPhone, alimentado por `GET /today/widget`.
 *
 * ── Por que o retrato inteiro vem pronto da API ─────────────────────────────
 * Agora são TRÊS escritores no widget: o app aberto (aqui), a tarefa em
 * segundo plano (`backgroundRefresh.ts`) e a extensão de notificação do
 * iPhone, que grava o retrato que chega dentro de cada push — e é ela que
 * atualiza o widget com o app fechado. Com três escritores, montar os rótulos
 * aqui criaria uma segunda versão que divergiria da que viaja no push. Por
 * isso até o texto é do servidor (`WidgetService` na API).
 *
 * ── Por que uma linha do tempo, e não um retrato ──────────────────────────
 * A API manda o agora, a hora de fechar o dia e a meia-noite. O widget muda
 * sozinho nesses horários mesmo que nada mais o acorde.
 *
 * O hook mora no layout das abas, não numa tela: qualquer entrada no app
 * atualiza o widget.
 */
export const todayWidgetKey = ['todayWidget'] as const;

export function fetchTodayWidgetTimeline() {
  return apiFetch<{ timeline: TodayJourneyTimelineEntry[] }>('/today/widget');
}

/** Busca e publica a linha do tempo. Chamado uma vez, no layout das abas. */
export function useTodayJourneySync() {
  const query = useQuery({
    queryKey: todayWidgetKey,
    queryFn: fetchTodayWidgetTimeline,
    // O widget é o que se vê com o app fechado: vale buscar de novo ao voltar.
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (query.data?.timeline?.length) {
      writeTodayJourneyTimeline(query.data.timeline);
    }
  }, [query.data]);

  // Qualquer ação concluída no app (marcar hábito, registrar treino, comprar,
  // fechar o dia…) muda o que o widget mostra. Em vez de lembrar de invalidar
  // o widget em cada mutação, escuta todas — com um atraso curto, para uma
  // sequência de toques virar uma busca só.
  const queryClient = useQueryClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.mutation.state.status !== 'success') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: todayWidgetKey });
      }, 2_000);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient]);
}
