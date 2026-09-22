import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { syncLiveActivities } from './liveActivities';

/**
 * Reconcilia as Live Activities ao entrar no app e a cada volta ao primeiro
 * plano — é quando o iOS deixa COMEÇAR uma atividade pelo app. Use no layout
 * do app autenticado, ao lado dos outros sincronizadores.
 */
export function useLiveActivitiesSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') return;
    void syncLiveActivities();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncLiveActivities();
    });
    return () => subscription.remove();
  }, [enabled]);
}
