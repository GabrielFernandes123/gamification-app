import { addPushToStartTokenListener } from 'expo-widgets';
import { AppState, Platform } from 'react-native';

import { apiFetch } from '@/lib/api';

import DayActivity, { type DayActivityProps } from './DayActivity';
import FocusActivity, { type FocusActivityProps } from './FocusActivity';

/**
 * O GERENCIADOR DAS LIVE ACTIVITIES, do lado do app.
 *
 * Duas pontas mantêm as atividades vivas (ver `LiveService` na API):
 *
 *  • a API fala com a Apple — começa o dia na hora certa, atualiza, reinicia
 *    antes das 8h e termina. Para isso ela precisa dos TOKENS, e quem os tem é
 *    o app: o de "começar sozinha" (push-to-start) e o de atualização de cada
 *    atividade viva. Mandar esses tokens é a primeira função daqui;
 *  • o app, quando roda (aberto ou acordado em segundo plano), reconcilia por
 *    conta própria: começa o que devia estar na tela (só em primeiro plano —
 *    regra do iOS), atualiza o conteúdo e termina o que não devia existir.
 */

export type LiveSettings = {
  day_enabled: boolean;
  day_start_hour: number;
  day_end_mode: 'close' | 'hour';
  day_end_hour: number;
  show_hp: boolean;
  show_screen: boolean;
  show_close: boolean;
  focus_enabled: boolean;
};

export type LiveState = {
  settings: LiveSettings;
  serverReady: boolean;
  canStartRemotely: boolean;
  /** Conteúdo do dia — só vem dentro da janela configurada. */
  day: DayActivityProps | null;
  focus: FocusActivityProps | null;
};

/** Link de volta ao app ao tocar na atividade. */
const DEEP_LINK = 'evolve:///(app)/(tabs)/dashboard';

/** Tokens já mandados nesta sessão do app — a API é idempotente, mas não precisa ouvir de novo. */
const sent = new Set<string>();
/** Atividades já observadas (o listener de token é por instância). */
const watched = new WeakSet<object>();

async function sendToken(kind: 'day' | 'focus', token: string, focusSessionId?: string) {
  const key = `${kind}:${token}`;
  if (sent.has(key)) return;
  try {
    await apiFetch('/live/tokens', {
      method: 'POST',
      body: { kind, token, ...(focusSessionId ? { focusSessionId } : {}) },
    });
    sent.add(key);
  } catch {
    // sem sessão ou sem rede: a próxima reconciliação manda
  }
}

type Instance = {
  getPushToken: () => Promise<string | null>;
  addPushTokenListener: (listener: (event: { pushToken: string }) => void) => unknown;
};

function watch(kind: 'day' | 'focus', instance: Instance, focusSessionId?: string) {
  void instance
    .getPushToken()
    .then((token) => {
      if (token) void sendToken(kind, token, focusSessionId);
    })
    .catch(() => undefined);
  if (watched.has(instance)) return;
  watched.add(instance);
  instance.addPushTokenListener((event) => {
    void sendToken(kind, event.pushToken, focusSessionId);
  });
}

let attached = false;

/**
 * Liga os ouvintes de token. Chamado na CARGA do bundle (layout raiz): quando o
 * iOS começa uma atividade por push e acorda o app para entregar o token, ele
 * precisa encontrar alguém escutando — nenhuma tela é montada nesse caso.
 */
export function attachLiveActivityListeners() {
  if (Platform.OS !== 'ios' || attached) return;
  attached = true;
  try {
    addPushToStartTokenListener((event) => {
      void apiFetch('/live/push-to-start', {
        method: 'POST',
        body: { token: event.activityPushToStartToken },
      }).catch(() => undefined);
    });
    for (const instance of DayActivity.getInstances()) watch('day', instance);
    for (const instance of FocusActivity.getInstances()) watch('focus', instance);
  } catch (error) {
    // Build sem suporte (anterior a esta) ou iOS < 16.2: segue sem atividade.
    console.warn('[live] ouvintes não ligados:', error);
  }
}

/**
 * Deixa as atividades do aparelho iguais ao que a API diz que deve existir.
 * Seguro de chamar a qualquer hora: sem mudança, não faz nada visível.
 */
export async function syncLiveActivities(): Promise<LiveState | null> {
  if (Platform.OS !== 'ios') return null;
  let state: LiveState;
  try {
    state = await apiFetch<LiveState>('/live/state');
  } catch {
    return null;
  }
  const emPrimeiroPlano = AppState.currentState === 'active';

  try {
    // ── Dia ────────────────────────────────────────────────────────────
    const dias = DayActivity.getInstances();
    if (state.day) {
      if (dias.length === 0) {
        // O iOS só deixa COMEÇAR com o app na frente; em segundo plano quem
        // começa é a API (push-to-start).
        if (emPrimeiroPlano) watch('day', DayActivity.start(state.day, DEEP_LINK));
      } else {
        const [atual, ...sobras] = dias;
        await atual.update(state.day);
        watch('day', atual);
        for (const sobra of sobras) await sobra.end('immediate');
      }
    } else {
      for (const dia of dias) await dia.end('immediate');
    }

    // ── Foco ───────────────────────────────────────────────────────────
    const focos = FocusActivity.getInstances();
    if (state.focus) {
      if (focos.length === 0) {
        if (emPrimeiroPlano) {
          watch('focus', FocusActivity.start(state.focus, DEEP_LINK), state.focus.sessionId);
        }
      } else {
        for (const foco of focos) watch('focus', foco, state.focus.sessionId);
      }
    } else {
      for (const foco of focos) await foco.end('immediate');
    }
  } catch (error) {
    // Live Activities desligadas nos Ajustes do iOS, ou iOS antigo.
    console.warn('[live] reconciliação falhou:', error);
  }
  return state;
}

/** Começa a do dia agora, mesmo fora da janela — o botão "Mostrar agora". */
export async function startDayActivityNow(props: DayActivityProps) {
  const existentes = DayActivity.getInstances();
  if (existentes.length > 0) {
    await existentes[0].update(props);
    return;
  }
  watch('day', DayActivity.start(props, DEEP_LINK));
}

/** Tira a do dia da tela — o botão "Tirar da tela". */
export async function endDayActivityNow() {
  for (const dia of DayActivity.getInstances()) {
    const token = await dia.getPushToken().catch(() => null);
    await dia.end('immediate');
    if (token) {
      void apiFetch('/live/ended', { method: 'POST', body: { token } }).catch(() => undefined);
    }
  }
}

export function updateLiveSettings(patch: Partial<LiveSettings>) {
  return apiFetch<LiveState>('/live/settings', { method: 'PUT', body: patch });
}
