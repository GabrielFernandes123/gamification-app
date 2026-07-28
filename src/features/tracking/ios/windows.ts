import * as DeviceActivity from 'react-native-device-activity';

import type { PolicyFocus, PolicyWindow } from './policy';
import { selectionIdFor } from './shieldSync';

/**
 * Janelas de horário e sessão de foco no iPhone.
 *
 * Este é o caso IDEAL do Screen Time: o `DeviceActivitySchedule` cobre um
 * intervalo nativamente, então bloquear das 8 às 11 não depende de medição
 * nenhuma — o iOS liga o shield na abertura e desliga no fim, mesmo com o app
 * fechado. É mais barato e mais confiável que o bloqueio por tempo de uso.
 *
 * ORÇAMENTO DE ATIVIDADES: a Apple limita ~20 monitores simultâneos. Duas
 * decisões seguram isso:
 *
 *  1. uma atividade por FAIXA, com a união dos apps do conjunto como seleção —
 *     uma janela com dez apps custa uma atividade por faixa, não dez;
 *  2. só as faixas de HOJE são armadas. O sync roda a cada abertura do app e no
 *     rearme diário, então o número de atividades vivas não depende de quantas
 *     faixas você configurou.
 */

/** Ids de seleção próprios: o nome da atividade precisa conter o id (regra da lib). */
export function windowSelectionId(windowId: string): string {
  return `win-${windowId.replace(/[^a-zA-Z0-9]/g, '')}`;
}

export function focusSelectionId(focusId: string): string {
  return `foc-${focusId.replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** Só os alvos `app:` interessam ao iPhone; `domain:` é do PC. */
function appMatchers(targets: string[]): string[] {
  return (targets ?? [])
    .filter((t) => t.startsWith('app:'))
    .map((t) => t.slice('app:'.length));
}

/**
 * União das seleções das fontes de um conjunto.
 *
 * Cada fonte já tem seu app vinculado (`src-<matcher>`); aqui juntamos todas
 * numa seleção só, que é o que a atividade da janela vai vigiar.
 */
export function unionSelectionFor(targets: string[]): string | null {
  const parts = appMatchers(targets)
    .map((matcher) => DeviceActivity.getFamilyActivitySelectionId(selectionIdFor(matcher)))
    .filter((sel): sel is string => Boolean(sel));
  if (parts.length === 0) return null;

  // `union` é binário: dobra par a par até sobrar uma seleção só.
  return parts.reduce<string | null>((acc, token) => {
    if (acc === null) return token;
    const merged = DeviceActivity.union(
      { activitySelectionToken: acc },
      { activitySelectionToken: token },
    );
    return merged?.familyActivitySelection ?? acc;
  }, null);
}

/** Faixas da janela que valem para HOJE (dia da semana do aparelho). */
export function todaySlots(win: PolicyWindow, now = new Date()) {
  const weekday = now.getDay();
  return (win.slots ?? []).filter((slot) => slot.weekdays?.includes(weekday));
}

function toComponents(hhmm: string) {
  const [hour, minute] = hhmm.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

export type WindowArmResult = {
  activities: string[];
  blockedNow: number;
  /**
   * Janelas de hoje que não puderam ser armadas porque NENHUM app do conjunto
   * está vinculado neste aparelho. Era o furo mais silencioso do bloqueio: a
   * janela existia, aparecia configurada na web, e o iPhone simplesmente pulava.
   */
  skipped: string[];
};

/**
 * Arma as janelas do dia e aplica o bloqueio das que já estão ativas.
 *
 * O shield da janela é escrito por SELEÇÃO DA JANELA, então a tela diz
 * "Bloqueado: horário de trabalho" em vez do nome do app — o que comunica
 * melhor o motivo, e é o que a resolução por nome de atividade permite.
 */
export async function armWindows(
  windows: PolicyWindow[],
  appearance: Record<string, unknown>,
  isUnlocked: (targetKey: string) => boolean,
  now: Date,
  pay: { apiUrl: string; token: string; gold: number; clientIdFor: (id: string) => string },
): Promise<WindowArmResult> {
  const activities: string[] = [];
  const skipped: string[] = [];
  let blockedNow = 0;

  for (const win of windows) {
    const slots = todaySlots(win, now);
    if (slots.length === 0) continue;

    const selectionId = windowSelectionId(win.id);
    const selection = unionSelectionFor(win.targets);
    if (!selection) {
      // nenhum app do conjunto vinculado neste aparelho: não há o que bloquear
      skipped.push(win.name);
      continue;
    }

    DeviceActivity.setFamilyActivitySelectionId({
      id: selectionId,
      familyActivitySelection: selection,
    });

    // Mesma regra da bolsa das fontes: sem ouro, o botão nem existe. A
    // extension não lê a resposta do POST, então recusar depois do toque
    // liberaria de graça.
    const canPay = win.unlock_cost_gold <= pay.gold;
    DeviceActivity.userDefaultsSet(`shieldConfigurationForSelection_${selectionId}`, {
      ...appearance,
      title: `Bloqueado: ${win.name}`,
      subtitle: `Fora do horário permitido. Abrir mesmo assim custa ${win.unlock_cost_gold} de ouro por ${win.unlock_minutes} min.`,
      primaryButtonLabel: 'Voltar',
      secondaryButtonLabel: canPay ? `Pagar ${win.unlock_cost_gold} e abrir` : undefined,
    });

    DeviceActivity.userDefaultsSet(`shieldActionsForSelection_${selectionId}`, {
      primary: { behavior: 'close' },
      secondary: canPay
        ? {
            behavior: 'close',
            actions: [
              {
                type: 'sendHttpRequest',
                url: `${pay.apiUrl}/tracking/unlock`,
                options: {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${pay.token}`,
                    'Content-Type': 'application/json',
                  },
                  body: {
                    target_type: 'window',
                    target: win.id,
                    client_id: pay.clientIdFor(win.id),
                  },
                },
              },
              { type: 'unblockSelection', familyActivitySelectionId: selectionId },
            ],
          }
        : undefined,
    });

    // uma atividade por faixa — o nome contém o id da seleção, senão a
    // extension não acha a configuração e cai no texto genérico
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const activityName = `${selectionId}-s${i}`;
      await DeviceActivity.startMonitoring(
        activityName,
        {
          intervalStart: toComponents(slot.start_time),
          intervalEnd: toComponents(slot.end_time),
          repeats: true,
        },
        [],
      );
      // no início da faixa bloqueia, no fim libera — sem medição nenhuma
      DeviceActivity.configureActions({
        activityName,
        callbackName: 'intervalDidStart',
        actions: [{ type: 'blockSelection', familyActivitySelectionId: selectionId }],
      });
      DeviceActivity.configureActions({
        activityName,
        callbackName: 'intervalDidEnd',
        actions: [{ type: 'unblockSelection', familyActivitySelectionId: selectionId }],
      });
      activities.push(activityName);
    }

    // Estado AGORA: o callback pode ter sido perdido (app fechado, aparelho
    // desligado), então o sync reconcilia em vez de confiar só no evento.
    if (win.active && !isUnlocked(`window:${win.id}`)) {
      DeviceActivity.blockSelection({ activitySelectionId: selectionId }, 'window');
      blockedNow++;
    } else {
      DeviceActivity.unblockSelection({ activitySelectionId: selectionId }, 'window');
    }
  }

  return { activities, blockedNow, skipped };
}

/**
 * Sessão de foco: bloqueia o conjunto até `ends_at`.
 *
 * Sem botão de pagar na tela — abandonar é decisão explícita no app, e custa.
 * Vale para o iPhone mesmo quando a sessão foi iniciada no PC, porque ela viaja
 * na política.
 */
export function applyFocus(
  focus: PolicyFocus | null,
  appearance: Record<string, unknown>,
  previousId: string | null,
): string | null {
  if (previousId && (!focus || focusSelectionId(focus.id) !== previousId)) {
    DeviceActivity.unblockSelection({ activitySelectionId: previousId }, 'focus');
  }
  if (!focus || new Date(focus.ends_at).getTime() <= Date.now()) return null;

  const selectionId = focusSelectionId(focus.id);
  const selection = unionSelectionFor(focus.targets);
  if (!selection) return null;

  DeviceActivity.setFamilyActivitySelectionId({
    id: selectionId,
    familyActivitySelection: selection,
  });
  const ends = new Date(focus.ends_at);
  DeviceActivity.userDefaultsSet(`shieldConfigurationForSelection_${selectionId}`, {
    ...appearance,
    title: 'Sessão de foco',
    subtitle: `Você está em foco até ${String(ends.getHours()).padStart(2, '0')}:${String(
      ends.getMinutes(),
    ).padStart(2, '0')}. Abandonar custa ${focus.abandon_cost_gold} de ouro — faça isso pelo Evolve.`,
    primaryButtonLabel: 'Voltar',
  });
  DeviceActivity.userDefaultsSet(`shieldActionsForSelection_${selectionId}`, {
    primary: { behavior: 'close' },
  });
  DeviceActivity.blockSelection({ activitySelectionId: selectionId }, 'focus');
  return selectionId;
}
