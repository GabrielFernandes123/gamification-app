import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { syncSleepOnce } from '@/features/health/useHealthSync';
import { syncLiveActivities } from '@/features/live/liveActivities';
import { syncShield } from '@/features/tracking/ios/shieldSync';
import { fetchTodayWidgetTimeline } from '@/features/widgets/useTodayJourney';
import { writeTodayJourneyTimeline } from '@/features/widgets/useTodayJourneyWidget';
import { supabase } from '@/lib/supabase';

/**
 * A TAREFA EM SEGUNDO PLANO — o que acontece com o app minimizado.
 *
 * O iOS acorda o app de tempos em tempos (o piso é 15 min; na prática o
 * sistema escolhe, pela bateria, pela rede e pelo uso). A cada acordada:
 *
 *  1. o WIDGET recebe a linha do tempo nova da API;
 *  2. o BLOQUEIO é ressincronizado — preço e saldo da tela de bloqueio, e o uso
 *     medido pelo Tempo de Uso sobe para o servidor (sem isto, só ao abrir);
 *  3. o SONO da última noite é importado do app Saúde.
 *
 * Limite que não tem contorno: app FECHADO (deslizado para cima) não é
 * acordado. Para esse caso existe a extensão de notificação, que atualiza o
 * widget a cada push (ver targets/NotificationService).
 *
 * `defineTask` precisa rodar no escopo global, na carga do bundle — é por isso
 * que este módulo é importado no layout raiz, e não dentro de um componente:
 * quando o iOS acorda o app em segundo plano, nenhuma tela é montada.
 */
export const BACKGROUND_REFRESH_TASK = 'evolve-background-refresh';

TaskManager.defineTask(BACKGROUND_REFRESH_TASK, async () => {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return BackgroundTask.BackgroundTaskResult.Success;

    const { timeline } = await fetchTodayWidgetTimeline();
    if (timeline?.length) writeTodayJourneyTimeline(timeline);

    if (Platform.OS === 'ios') {
      // Cada passo falha sozinho: o widget já atualizado vale mesmo que o
      // bloqueio ou o sono tropecem.
      await syncShield().catch(() => undefined);
      await syncSleepOnce().catch(() => undefined);
      // Atualiza o conteúdo das Live Activities (começar, só a API ou o app
      // em primeiro plano conseguem — regra do iOS).
      await syncLiveActivities().catch(() => undefined);
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.warn('[segundo plano] falhou:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Registra a tarefa (idempotente). Só faz sentido com sessão ativa. */
export async function registerBackgroundRefresh() {
  if (Platform.OS !== 'ios') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;
    const jaRegistrada = await TaskManager.isTaskRegisteredAsync(BACKGROUND_REFRESH_TASK);
    if (!jaRegistrada) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_REFRESH_TASK, {
        minimumInterval: 15,
      });
    }
  } catch (error) {
    // Build sem o módulo nativo (anterior a este): segue sem segundo plano.
    console.warn('[segundo plano] não registrou:', error);
  }
}

/** Use no layout do app autenticado. */
export function useBackgroundRefresh(enabled: boolean) {
  useEffect(() => {
    if (enabled) void registerBackgroundRefresh();
  }, [enabled]);
}
