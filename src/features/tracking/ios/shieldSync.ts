import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DeviceActivity from 'react-native-device-activity';

import { env } from '@/lib/env';
import { getDeviceToken } from './deviceToken';
import {
  fetchPolicy,
  isUnlocked,
  postIntervals,
  sendHeartbeat,
  type Policy,
  type PolicySource,
} from './policy';
import {
  ladderEvents,
  measuresByDeviceActivity,
  pendingIntervals,
  type PendingInterval,
} from './measure';
import { ensureShieldIcon, shieldAppearance } from './shieldTheme';
import { applyFocus, armWindows } from './windows';

/**
 * Motor do bloqueio no iPhone.
 *
 * Divisão de responsabilidade (mesma do PC, e é o que mantém o servidor como
 * autoridade): o SERVIDOR sabe quanto foi usado e quanto custa; o TELEFONE só
 * executa. A cada sync o app traduz a política em três coisas gravadas no App
 * Group, de onde as extensions leem sem rede:
 *
 *   1. um THRESHOLD por fonte — "me avise quando faltarem N segundos" — que é a
 *      única forma confiável de medir do lado do iOS (o total não sai da
 *      sandbox, ver 12-ios-limitacoes.md §3.1.1);
 *   2. a CONFIGURAÇÃO da tela de bloqueio daquela fonte (label e preço);
 *   3. as AÇÕES do botão de liberar: cobra na API, derruba o shield e rearma o
 *      re-bloqueio — tudo declarativo, sem Swift.
 *
 * A BOLSA (`grants`) é o que garante "nunca libera sem lastro": a extension não
 * consegue ler a resposta do POST, então quem decide se o botão aparece é o
 * saldo que o app calculou no último sync.
 *
 * Dois limites conhecidos, ambos falhando para o lado seguro:
 *
 *  • o POST do botão é fire-and-forget. Se a rede falhar, a liberação acontece
 *    sem débito — mas o próximo sync vê que não há liberação viva no servidor e
 *    RE-BLOQUEIA. O prejuízo é limitado aos minutos até o próximo sync.
 *  • o `client_id` é gravado na configuração, então é fixo entre syncs. Apertar
 *    o botão duas vezes sem sincronizar no meio cobra uma vez só (o recibo
 *    deduplica). Um id por toque exigiria gerá-lo dentro da extension.
 */

/**
 * Nomes das atividades e eventos.
 *
 * REGRA CRÍTICA: o nome da atividade monitorada precisa CONTER o id da seleção.
 * A extension resolve a configuração da tela de bloqueio procurando, entre as
 * atividades vivas, uma cujo nome contenha o id — se não achar, usa o texto
 * genérico de fallback. Por isso cada fonte tem sua própria atividade em vez de
 * todas compartilharem uma.
 */
function activityFor(selectionId: string): string {
  return selectionId;
}
function thresholdEventFor(selectionId: string): string {
  return `${selectionId}-limit`;
}
function unlockActivityFor(selectionId: string): string {
  return `${selectionId}-unlock`;
}
function relockEventFor(selectionId: string): string {
  return `${selectionId}-relock`;
}

/** Chaves que as extensions leem (ver ios/Shared.swift da lib). */
const SHIELD_CONFIG_PREFIX = 'shieldConfigurationForSelection';
const SHIELD_ACTIONS_PREFIX = 'shieldActionsForSelection';

/** O dia inteiro: o rearme diário acontece no primeiro sync de cada dia local. */
const DAILY_SCHEDULE = {
  intervalStart: { hour: 0, minute: 0 },
  intervalEnd: { hour: 23, minute: 59 },
  repeats: true,
};

/**
 * Seleção da sessão de foco aplicada no último sync. Guardada para derrubar o
 * bloqueio quando a sessão acaba ou muda — o id da sessão some da política e
 * sem esta lembrança não haveria o que desbloquear.
 */
let lastFocusSelectionId: string | null = null;

/** Ids viajam em nomes de chave do UserDefaults — mantenha-os simples. */
function sanitize(matcher: string): string {
  return matcher.replace(/[^a-zA-Z0-9]/g, '-');
}

/** Id da seleção (um app por fonte) — o vínculo "este app É esta fonte". */
export function selectionIdFor(matcher: string): string {
  return `src-${sanitize(matcher)}`;
}

/** A fonte já tem um app do iPhone vinculado? */
export function hasLinkedApp(matcher: string): boolean {
  if (!DeviceActivity.isAvailable()) return false;
  return Boolean(DeviceActivity.getFamilyActivitySelectionId(selectionIdFor(matcher)));
}

export type SyncResult =
  | { ok: false; reason: 'unavailable' | 'unauthorized' | 'error'; message?: string }
  | {
      ok: true;
      armed: number;
      blocked: number;
      unlocked: number;
      unlinked: number;
      /** Domínios no filtro de conteúdo web (palavras bloqueadas que são domínio). */
      filteredDomains: number;
      /** Palavras (não-domínio) entregues à extensão do Safari. */
      safariKeywords: number;
      /** Intervalos medidos pelo DeviceActivity enviados para ingestão. */
      measuredIntervals: number;
      /** Janelas de horário bloqueando agora. */
      windowsBlocked: number;
      /** Há sessão de foco ativa aplicada neste aparelho. */
      focusActive: boolean;
      /** Fontes que falharam ao armar (uma falha não derruba as outras). */
      failures: string[];
    };

/**
 * Fontes que este aparelho precisa monitorar. As de `domain` são do PC.
 *
 * Duas razões INDEPENDENTES para monitorar uma fonte de app:
 *  • ela bloqueia (`block_after_seconds`), ou
 *  • ela é MEDIDA aqui (`ios_measure = 'device_activity'`) — a escada de
 *    limiares é o único jeito de medir, e ela precisa de uma atividade viva.
 *
 * Filtrar só por limite deixava a fonte medida-sem-bloqueio sem atividade
 * nenhuma: nada era medido e o servidor via zero para sempre.
 */
function monitoredSources(policy: Policy): PolicySource[] {
  return policy.sources.filter(
    (s) =>
      s.kind === 'app' && (s.block_after_seconds != null || measuresByDeviceActivity(s)),
  );
}

/**
 * Configura a tela de bloqueio e o botão de liberar DESTA fonte.
 *
 * `{applicationOrDomainDisplayName}` é substituído pela extension com o nome
 * real do app (o token é opaco para nós, mas não para ela) — é assim que a tela
 * consegue dizer "YouTube" sem que o app jamais saiba o bundle id.
 */
function writeShieldFor(
  source: PolicySource,
  selectionId: string,
  token: string,
  grants: number,
  clientId: string,
  hasIcon: boolean,
  cooldownUntil: Date | null,
) {
  // PRÓXIMO preço, não o base: o servidor cobra com a escalada do dia aplicada,
  // e a extension não lê a resposta do POST para corrigir depois.
  const cost = source.next_unlock_cost;
  const inCooldown = cooldownUntil !== null;
  const canAfford = grants > 0 && !inCooldown;

  DeviceActivity.userDefaultsSet(`${SHIELD_CONFIG_PREFIX}_${selectionId}`, {
    ...shieldAppearance(hasIcon),
    title: `${source.label} bloqueado`,
    subtitle: canAfford
      ? `Você passou do limite de hoje. Liberar ${source.unlock_minutes} min custa ${cost} de ouro.`
      : inCooldown
        ? `Você passou do limite de hoje. Nova liberação só a partir das ${formatTime(cooldownUntil)}.`
        : `Você passou do limite de hoje e não tem ${cost} de ouro para liberar. Cumpra hábitos e volte.`,
    primaryButtonLabel: 'Voltar',
    secondaryButtonLabel: canAfford ? `Pagar ${cost} e liberar` : undefined,
  });

  DeviceActivity.userDefaultsSet(`${SHIELD_ACTIONS_PREFIX}_${selectionId}`, {
    primary: { behavior: 'close' },
    secondary: canAfford
      ? {
          behavior: 'close',
          actions: [
            // 1) cobra. Fire-and-forget: a extension não lê a resposta, por isso
            //    o app reenvia no próximo sync — o client_id torna idempotente.
            {
              type: 'sendHttpRequest',
              url: `${env.API_URL}/tracking/unlock`,
              options: {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: {
                  target_type: 'source',
                  kind: 'app',
                  target: source.matcher,
                  client_id: clientId,
                },
              },
            },
            // 2) derruba o shield desta fonte
            { type: 'unblockSelection', familyActivitySelectionId: selectionId },
            // 3) rearma: o crédito é de N minutos DE USO, não de relógio — sair
            //    do app não queima o que foi pago.
            {
              type: 'startMonitoring',
              activityName: unlockActivityFor(selectionId),
              deviceActivityEvents: [
                {
                  familyActivitySelection:
                    DeviceActivity.getFamilyActivitySelectionId(selectionId) ?? '',
                  threshold: { minute: source.unlock_minutes },
                  eventName: relockEventFor(selectionId),
                  // aqui NÃO: o crédito comprado conta do toque em diante
                  includesPastActivity: false,
                },
              ],
            },
          ],
        }
      : undefined,
  });
}

/**
 * Configuração GENÉRICA de fallback.
 *
 * A extension usa `shieldConfigurationForSelection_<id>` quando encontra, e cai
 * nesta quando o token bloqueado não pertence a nenhuma seleção conhecida —
 * o que acontece com sobras de teste (a seleção `spike`) ou com uma fonte que
 * foi apagada. Sobrescrevemos a cada sync para que sobra nenhuma mostre texto
 * de spike, e para que o botão de liberar não exista sem preço definido.
 */
function writeFallbackShield(hasIcon: boolean) {
  DeviceActivity.updateShield(
    {
      ...shieldAppearance(hasIcon),
      title: 'Bloqueado pelo Evolve',
      subtitle: 'Abra o Evolve para ver o limite desta fonte e o preço da liberação.',
      primaryButtonLabel: 'Voltar',
    },
    { primary: { behavior: 'close' } },
    'syncFallback',
  );
}

/** Teto da lista de domínios do filtro de conteúdo do Screen Time. */
const MAX_FILTER_DOMAINS = 50;

/** "youtube.com" é domínio; "fofoca" não. */
function looksLikeDomain(phrase: string): boolean {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(phrase.trim().toLowerCase());
}

/**
 * Palavras bloqueadas que são DOMÍNIOS vão para o filtro de conteúdo web do
 * próprio Screen Time — que vale em TODOS os navegadores, não só no Safari, e
 * não depende de o usuário habilitar extensão nenhuma.
 *
 * Palavras que não são domínio (ex.: "fofoca") não têm como ser tratadas aqui:
 * o filtro é por domínio, não por termo. Essas dependem da extensão do Safari.
 *
 * Palavra com liberação viva sai da lista — é assim que a compra "abre" o site
 * pelos minutos pagos.
 */
function syncWebContentFilter(policy: Policy, now: number): number {
  const domains = policy.keywords
    .filter((k) => looksLikeDomain(k.phrase))
    .filter((k) => !isUnlocked(policy, `keyword:${k.id}`, now))
    .map((k) => k.phrase.trim().toLowerCase())
    .slice(0, MAX_FILTER_DOMAINS);

  if (domains.length === 0) {
    DeviceActivity.clearWebContentFilterPolicy('sync');
    return 0;
  }
  DeviceActivity.setWebContentFilterPolicy({ type: 'specific', domains }, 'sync');
  return domains.length;
}

/**
 * Política da extensão do Safari, no App Group.
 *
 * Só as palavras que NÃO são domínio: as que são já foram cobertas pelo filtro
 * de conteúdo, que é mais forte (vale em todos os navegadores). Aqui vai o que
 * só um content script consegue pegar — termo dentro da URL.
 *
 * Nenhum token viaja: a extensão manda o usuário para a tela `/blocked` da web,
 * que cobra usando a sessão do navegador.
 */
function writeSafariPolicy(policy: Policy, now: number): number {
  const keywords = policy.keywords
    .filter((k) => !looksLikeDomain(k.phrase))
    .filter((k) => !isUnlocked(policy, `keyword:${k.id}`, now))
    .map((k) => ({
      id: k.id,
      phrase: k.phrase,
      cost: k.unlock_cost_gold,
      minutes: k.unlock_minutes,
    }));

  DeviceActivity.userDefaultsSet('safariPolicy', {
    keywords,
    blockedUrl: `${env.WEB_URL}/blocked`,
    updatedAt: new Date().toISOString(),
  });
  return keywords.length;
}

/** Ao estourar o limiar (ou o crédito comprado), o shield sobe sozinho. */
function armCallback(activityName: string, eventName: string, selectionId: string) {
  DeviceActivity.configureActions({
    activityName,
    callbackName: 'eventDidReachThreshold',
    eventName,
    actions: [{ type: 'blockSelection', familyActivitySelectionId: selectionId }],
  });
}

/** Marca que esta instalação JÁ teve a autorização concedida alguma vez. */
const AUTH_SEEN_KEY = 'tracking.screenTimeAuthorized';

/**
 * A autorização de Tempo de Uso, resolvida com paciência.
 *
 * `getAuthorizationStatus()` não é confiável no primeiro instante depois de
 * abrir o app: o FamilyControls ainda está restaurando o estado e responde
 * `notDetermined` (0) mesmo com a permissão concedida. Como o sync roda no
 * layout raiz, ele caía exatamente nessa janela — o app dizia "autorização não
 * concedida", o painel aparecia desvinculado e só voltava ao normal depois de
 * o usuário conceder de novo (o que, na prática, era o iOS respondendo na
 * hora, porque a permissão nunca tinha caído).
 *
 * Duas defesas, nesta ordem:
 *  1. reler algumas vezes com folga — resolve a corrida de arranque;
 *  2. se esta instalação já esteve autorizada, pedir de novo: com a permissão
 *     ainda válida o iOS devolve na hora, SEM diálogo. Só aparece prompt se a
 *     permissão tiver caído de verdade — que é o caso em que ele tem de
 *     aparecer mesmo.
 *
 * `denied` (1) é resposta definitiva e sai na hora: ali o usuário disse não.
 */
async function resolveAuthorization(): Promise<number> {
  let status = DeviceActivity.getAuthorizationStatus();
  for (let attempt = 0; attempt < 3 && status === 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    status = DeviceActivity.getAuthorizationStatus();
  }
  if (status === 2) {
    await AsyncStorage.setItem(AUTH_SEEN_KEY, '1');
    return status;
  }
  if (status !== 0) return status;

  const wasAuthorized = await AsyncStorage.getItem(AUTH_SEEN_KEY);
  if (!wasAuthorized) return status;
  try {
    await DeviceActivity.requestAuthorization('individual');
  } catch {
    // negar aqui é uma resposta legítima: o status abaixo conta a história
  }
  status = DeviceActivity.getAuthorizationStatus();
  if (status === 2) await AsyncStorage.setItem(AUTH_SEEN_KEY, '1');
  return status;
}

/**
 * Traduz a política do servidor no estado do shield. Idempotente: rodar duas
 * vezes seguidas deixa o aparelho no mesmo lugar.
 */
export async function syncShield(): Promise<SyncResult> {
  if (!DeviceActivity.isAvailable()) return { ok: false, reason: 'unavailable' };

  try {
    const token = await getDeviceToken();
    const policy = await fetchPolicy(token);
    const now = Date.now();

    // A extensão do Safari NÃO depende de Screen Time: ela só lê palavras do
    // App Group. Por isso a política dela é escrita antes de qualquer checagem
    // de autorização — senão negar o Tempo de Uso derrubaria também o bloqueio
    // por palavra, que é independente.
    const safariKeywords = writeSafariPolicy(policy, now);

    const status = await resolveAuthorization();
    if (status !== 2) {
      // `notDetermined` (0) NÃO é sabotagem: é app recém-instalado ou usuário
      // que ainda não autorizou — e o iOS revoga a autorização a cada
      // reinstalação. Só `denied` (1) é um "não" de verdade; no caso ambíguo
      // omitimos a flag (ausente = "não sei", ver HeartbeatDto).
      await sendHeartbeat(
        token,
        status === 1 ? { screen_time_authorized: false, shield_armed: false } : {},
      );
      return { ok: false, reason: 'unauthorized' };
    }
    // copia a logo para o App Group (uma vez por instalacao)
    const hasIcon = await ensureShieldIcon();
    writeFallbackShield(hasIcon);

    const liveActivities = new Set<string>();
    const measured: PendingInterval[] = [];
    let armed = 0;
    let blocked = 0;
    let unlockedCount = 0;
    // Fontes que falharam ao armar. Sem isto o card dizia "Ativo" enquanto o
    // aparelho não bloqueava nada.
    const failures: string[] = [];
    // Relato do vínculo app<->fonte para o painel web. Só este laço sabe: o
    // token da seleção vive no App Group e nunca sai do aparelho.
    const linkedMatchers: string[] = [];
    const unlinkedMatchers: string[] = [];

    for (const source of monitoredSources(policy)) {
      const selectionId = selectionIdFor(source.matcher);
      const selection = DeviceActivity.getFamilyActivitySelectionId(selectionId);
      if (!selection) {
        // fonte cadastrada mas sem app do iPhone vinculado
        unlinkedMatchers.push(source.matcher);
        continue;
      }
      linkedMatchers.push(source.matcher);

      // Uma fonte problemática (limite absurdo, seleção corrompida, excesso de
      // atividades) fazia `startMonitoring` lançar e derrubava o sync INTEIRO —
      // sem janelas, sem ingestão, sem heartbeat, e sem nada na tela dizendo
      // isso. Cada fonte falha sozinha e o resto continua.
      try {
        const blocks = source.block_after_seconds != null;

        // Bolsa: quantas liberações o saldo REAL cobre. É isto que impede
        // liberação sem lastro, já que a extension decide offline.
        const cost = source.next_unlock_cost;
        const grants = cost > 0 ? Math.floor(policy.gold / cost) : 1;
        const cooldownUntil = source.unlock_available_at
          ? new Date(source.unlock_available_at)
          : null;
        // um id por sync: reenvio da mesma compra é no-op no servidor
        const clientId = randomUuid();
        writeShieldFor(source, selectionId, token, grants, clientId, hasIcon, cooldownUntil);

        // O botão de liberar arma a atividade de crédito; sem configurar o
        // callback DELA, o limiar do crédito dispararia sem re-bloquear.
        armCallback(unlockActivityFor(selectionId), relockEventFor(selectionId), selectionId);
        liveActivities.add(unlockActivityFor(selectionId));

        // SEMPRE monitora, mesmo já bloqueado. Não é só medição: a extension só
        // acha a configuração da fonte se o NOME DA ATIVIDADE contiver o id da
        // seleção (ver getPossibleFamilyActivitySelectionIds na lib). Sem uma
        // atividade viva com esse nome, a tela de bloqueio cai no texto genérico.
        const activityName = activityFor(selectionId);
        const events: DeviceActivity.DeviceActivityEvent[] = [];

        if (blocks) {
          events.push({
            familyActivitySelection: selection,
            // Limite CHEIO com `includesPastActivity`: o iOS conta o dia inteiro
            // pela medição dele, que é completa — o `seconds_today` do servidor no
            // iPhone só sabe o que os Atalhos reportaram e costuma estar defasado.
            threshold: secondsToComponents(source.block_after_seconds ?? 0),
            eventName: thresholdEventFor(selectionId),
            includesPastActivity: true,
          });
        }

        // Fase 4: escada de limiares na MESMA atividade (a Apple limita o número
        // de atividades monitoradas, então não se gasta uma só para medir).
        if (measuresByDeviceActivity(source)) {
          events.push(...ladderEvents(source, selectionId, selection));
          // o que já disparou virou uso: traduz em intervalos para a ingestão
          measured.push(...pendingIntervals(source, selectionId, activityName));
        }

        // Ações ANTES de iniciar: com `includesPastActivity` o limiar pode
        // disparar assim que a atividade sobe (o uso do dia já passou dele), e
        // sem as ações gravadas esse disparo não levantaria o shield.
        if (blocks) armCallback(activityName, thresholdEventFor(selectionId), selectionId);
        await DeviceActivity.startMonitoring(activityName, DAILY_SCHEDULE, events);
        liveActivities.add(activityName);
        armed++;

        // Fonte só medida (sem limite) não tem o que bloquear — e se o limite
        // acabou de ser removido, é aqui que o shield antigo cai.
        if (!blocks) {
          DeviceActivity.unblockSelection({ activitySelectionId: selectionId }, 'sync');
          continue;
        }

        if (isUnlocked(policy, `app:${source.matcher}`, now)) {
          DeviceActivity.unblockSelection({ activitySelectionId: selectionId }, 'sync');
          unlockedCount++;
          continue;
        }

        // Caminho rápido: o servidor já sabe que estourou, não espera o limiar.
        // Os dois medem em paralelo — vale quem perceber primeiro.
        const remaining = (source.block_after_seconds ?? 0) - source.seconds_today;
        if (remaining <= 0) {
          DeviceActivity.blockSelection({ activitySelectionId: selectionId }, 'sync');
          blocked++;
        } else {
          DeviceActivity.unblockSelection({ activitySelectionId: selectionId }, 'sync');
        }
      } catch (error) {
        failures.push(
          `${source.label}: ${error instanceof Error ? error.message : 'falha'}`,
        );
        // mantém viva: parar de monitorar uma fonte que já estava armada seria
        // um jeito silencioso de destravar o bloqueio
        liveActivities.add(activityFor(selectionId));
      }
    }

    // Este sim exige autorização: o filtro de conteúdo é ManagedSettings.
    // Janelas e foco: bloqueio por relógio, sem medição. Vêm depois das fontes
    // porque usam a união das seleções que elas vincularam.
    const appearance = shieldAppearance(hasIcon) as unknown as Record<string, unknown>;
    const windowState = await armWindows(
      policy.windows ?? [],
      appearance,
      (key) => isUnlocked(policy, key, now),
      new Date(now),
      {
        apiUrl: env.API_URL,
        token,
        gold: policy.gold,
        // um id por sync, como nas fontes: reenvio é no-op no servidor
        clientIdFor: () => randomUuid(),
      },
    );
    for (const activity of windowState.activities) liveActivities.add(activity);
    for (const name of windowState.skipped) {
      failures.push(`janela "${name}": nenhum app do conjunto vinculado aqui`);
    }
    lastFocusSelectionId = applyFocus(policy.focus ?? null, appearance, lastFocusSelectionId);
    // só acusa se a sessão está VIVA: expirada, o null é o fim normal dela
    if (
      policy.focus &&
      new Date(policy.focus.ends_at).getTime() > now &&
      lastFocusSelectionId === null
    ) {
      failures.push('sessão de foco: nenhum app do conjunto vinculado aqui');
    }

    const filteredDomains = syncWebContentFilter(policy, now);

    // Higiene: atividades de fontes apagadas/desvinculadas (e a `evolve` das
    // versões anteriores) continuariam monitorando para sempre.
    const stale = DeviceActivity.getActivities().filter((a) => !liveActivities.has(a));
    if (stale.length > 0) DeviceActivity.stopMonitoring(stale);

    await postIntervals(token, measured);

    await sendHeartbeat(token, {
      screen_time_authorized: true,
      shield_armed: DeviceActivity.isShieldActive() || armed > 0,
      linked_matchers: linkedMatchers,
      unlinked_matchers: unlinkedMatchers,
    });

    return {
      ok: true,
      armed,
      blocked,
      unlocked: unlockedCount,
      unlinked: unlinkedMatchers.length,
      filteredDomains,
      safariKeywords,
      measuredIntervals: measured.length,
      windowsBlocked: windowState.blockedNow,
      focusActive: lastFocusSelectionId !== null,
      failures,
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'error',
      message: error instanceof Error ? error.message : 'Falha no sync',
    };
  }
}

/** `HH:MM` local, para o texto do shield. */
function formatTime(date: Date | null): string {
  if (!date) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** O limiar do DeviceActivity é DateComponents, não segundos. */
function secondsToComponents(totalSeconds: number) {
  const safe = Math.max(60, Math.round(totalSeconds)); // < 1 min é ruído
  return { hour: Math.floor(safe / 3600), minute: Math.floor((safe % 3600) / 60) };
}

/** UUID v4 sem dependência nova (o crypto do RN não tem randomUUID). */
function randomUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
