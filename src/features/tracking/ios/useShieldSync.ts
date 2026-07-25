import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { syncShield, type SyncResult } from './shieldSync';

/**
 * Estado do sync compartilhado por todo o app.
 *
 * Precisa ser de módulo, não de componente: o sync roda no layout raiz (para
 * acontecer mesmo se o usuário nunca abrir a tela de Tempo de tela) e o card de
 * status quer exibir o resultado. Com estado local, cada montagem disparava seu
 * próprio sync e a tela de status não veria o que o layout fez.
 */
let lastResult: SyncResult | null = null;
let inFlight: Promise<SyncResult> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Sincroniza, deduplicando chamadas concorrentes. Foreground do app, montagem
 * de tela e toque manual convergem para a mesma execução.
 */
export async function syncShieldOnce(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = syncShield()
    .then((result) => {
      lastResult = result;
      return result;
    })
    .finally(() => {
      inFlight = null;
      notify();
    });
  notify(); // avisa que começou (para o estado "sincronizando")
  return inFlight;
}

export function getLastSyncResult(): SyncResult | null {
  return lastResult;
}

/**
 * Dispara o sync ao montar e a cada volta para o primeiro plano.
 *
 * Use no layout raiz do app. Enquanto o app está fechado, quem segura o
 * bloqueio é o próprio iOS pelos limiares já armados — não há polling.
 */
export function useShieldSyncRunner(enabled: boolean) {
  useEffect(() => {
    // sem sessão não há como obter o token de dispositivo (`/devices/self` é JWT)
    if (!enabled || Platform.OS !== 'ios') return;
    void syncShieldOnce();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncShieldOnce();
    });
    return () => subscription.remove();
  }, [enabled]);
}

/** Observa o resultado do sync (para exibir status e forçar manualmente). */
export function useShieldSync() {
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const sync = useCallback(() => syncShieldOnce(), []);
  return { result: lastResult, syncing: inFlight !== null, sync };
}
