import * as DeviceActivity from 'react-native-device-activity';

import type { PolicySource } from './policy';

/**
 * Medição de tempo no iPhone pelo DeviceActivity — a Fase 4 do plano de iOS.
 *
 * O problema que isto resolve: o bloqueio já é preciso (o iOS conta o dia
 * inteiro pela medição dele), mas a COBRANÇA em ouro vinha dos Atalhos, que só
 * contam o que tem automação criada à mão e nem contam tela bloqueada. Resultado
 * visível: você era bloqueado corretamente aos 20 min enquanto o app dizia 3.
 *
 * Como medimos sem conseguir ler totais (12-ios-limitacoes.md §3.1.1): uma
 * ESCADA de limiares. Armamos eventos em 5, 10, 15… minutos; a extension
 * registra o instante de cada disparo no App Group (ela faz isso para todo
 * callback, independente de ação configurada), e o app traduz cada degrau
 * alcançado num intervalo de uso.
 *
 * Duas honestidades do método:
 *
 *  • a GRANULARIDADE é o passo da escada. Uso abaixo de um degrau não é
 *    contado — subcontamos, que é a regra da casa ("nunca inventar tempo").
 *  • a COLOCAÇÃO no tempo é aproximada. Cada degrau vira um intervalo que
 *    termina no instante do disparo, então uma rajada de disparos (o iOS
 *    recuperando uso passado ao armar) comprime vários intervalos numa janela
 *    curta. O TOTAL do dia fica certo — e é o total que cobra.
 */

/** Passo mínimo da escada. Menos que isto é ruído para o DeviceActivity. */
const MIN_STEP_MINUTES = 5;

/**
 * Teto de eventos por atividade. A Apple limita quantos limiares podem ser
 * agendados 🔍; 20 é conservador e cabe folgado no que já vimos funcionar.
 */
const MAX_STEPS = 20;

/** Cobertura mínima da escada quando a fonte não tem limite alto. */
const MIN_COVERAGE_SECONDS = 2 * 3600;

/** A fonte é medida pela extension nativa (e não pelos Atalhos)? */
export function measuresByDeviceActivity(source: PolicySource): boolean {
  return source.ios_measure === 'device_activity';
}

/** Nome do evento do degrau `step` (contém o id da seleção, como a lib exige). */
function stepEventName(selectionId: string, step: number): string {
  return `${selectionId}-m${step}`;
}

const STEP_EVENT_RE = /-m(\d+)$/;

/** Passo da escada: cobre o limite do dia (ou 2h) em no máximo MAX_STEPS degraus. */
export function stepMinutesFor(source: PolicySource): number {
  const coverage = Math.max(source.block_after_seconds ?? 0, MIN_COVERAGE_SECONDS);
  const minutes = Math.ceil(coverage / 60 / MAX_STEPS);
  return Math.max(MIN_STEP_MINUTES, minutes);
}

/**
 * Eventos da escada para somar aos do bloqueio na MESMA atividade — a Apple
 * limita o número de atividades monitoradas, então não vale gastar uma por
 * fonte só para medir.
 */
export function ladderEvents(
  source: PolicySource,
  selectionId: string,
  selection: string,
): DeviceActivity.DeviceActivityEvent[] {
  const step = stepMinutesFor(source);
  const events: DeviceActivity.DeviceActivityEvent[] = [];
  for (let i = 1; i <= MAX_STEPS; i++) {
    const total = step * i;
    events.push({
      familyActivitySelection: selection,
      threshold: { hour: Math.floor(total / 60), minute: total % 60 },
      eventName: stepEventName(selectionId, i),
      // conta o dia inteiro, igual ao limiar de bloqueio: sem isto a escada
      // ignoraria o uso anterior ao sync e a medição nasceria defasada
      includesPastActivity: true,
    });
  }
  return events;
}

export type PendingInterval = {
  id: string;
  kind: 'app';
  matcher: string;
  started_at: string;
  ended_at: string;
  mode: 'active';
};

/**
 * Traduz os disparos registrados em intervalos prontos para ingestão.
 *
 * O id é DETERMINÍSTICO por (matcher, dia do disparo, degrau): reenviar o mesmo
 * degrau é no-op no servidor (`on conflict (id) do nothing`), então não há
 * bookkeeping local de "o que já mandei" — e nada é contado duas vezes, nem
 * quando o sync roda várias vezes por minuto.
 */
export function pendingIntervals(
  source: PolicySource,
  selectionId: string,
  activityName: string,
): PendingInterval[] {
  const step = stepMinutesFor(source);
  const stepMs = step * 60_000;
  const intervals: PendingInterval[] = [];

  for (const event of DeviceActivity.getEvents(activityName)) {
    if (event.callbackName !== 'eventDidReachThreshold') continue;
    const match = STEP_EVENT_RE.exec(event.eventName ?? '');
    if (!match) continue; // é o limiar de bloqueio, não um degrau

    const firedAt = event.lastCalledAt;
    if (!(firedAt instanceof Date) || Number.isNaN(firedAt.getTime())) continue;
    if (firedAt.getTime() <= 0) continue; // nunca disparou

    const stepIndex = Number(match[1]);
    // dia do DISPARO, não "hoje": mantém o id estável se o sync cruzar a
    // meia-noite entre uma execução e outra
    const day = localDayKey(firedAt);
    intervals.push({
      id: deterministicUuid(`${source.matcher}|${day}|${stepIndex}`),
      kind: 'app',
      matcher: source.matcher,
      started_at: new Date(firedAt.getTime() - stepMs).toISOString(),
      ended_at: firedAt.toISOString(),
      mode: 'active',
    });
  }

  return intervals;
}

/** `YYYY-MM-DD` no fuso do aparelho. */
function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * UUID estável derivado de uma string.
 *
 * Precisa ser UUID porque o contrato de ingestão valida o formato, e precisa ser
 * determinístico porque é ele que garante a idempotência. Quatro passadas de
 * FNV-1a com sementes diferentes formam os 128 bits; os nibbles de versão e
 * variante são fixados para o valor passar como UUID v4 válido.
 */
function deterministicUuid(key: string): string {
  const parts = [0x811c9dc5, 0x01000193, 0x7fffffff, 0x9e3779b9].map((seed) =>
    fnv1a(key, seed).toString(16).padStart(8, '0'),
  );
  const hex = parts.join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

function fnv1a(text: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
