/**
 * Cache da política, do lado da extensão.
 *
 * O content script não fala com o nativo direto (e nem deveria: cada página
 * pediria de novo). O background busca a política do handler nativo, guarda em
 * memória por um tempo curto e responde às páginas.
 *
 * A política vem do App Group, escrita pelo app a cada sync. Uma compra feita
 * na tela /blocked NÃO passa pelo app, por isso existe o `refresh`: antes de
 * redirecionar, o content script pede ao nativo que confirme na API — senão a
 * pessoa pagava, voltava para a página e era bloqueada de novo.
 */

const TTL_MS = 60_000;
/** Várias abas casando juntas não viram várias chamadas à API. */
const REFRESH_DEDUPE_MS = 5_000;

let cache = null;
let fetchedAt = 0;
let refreshedAt = 0;
let inFlightRefresh = null;

async function askNative(refresh) {
  // o handler nativo devolve { policy: { keywords, blockedUrl } }
  const response = await browser.runtime.sendNativeMessage('application.id', {
    type: 'getPolicy',
    refresh,
  });
  return response?.policy ?? { keywords: [], blockedUrl: '' };
}

async function loadPolicy(refresh = false) {
  const now = Date.now();
  if (refresh) {
    if (inFlightRefresh) return inFlightRefresh;
    if (cache && now - refreshedAt < REFRESH_DEDUPE_MS) return cache;
  } else if (cache && now - fetchedAt < TTL_MS) {
    return cache;
  }

  const run = askNative(refresh)
    .then((policy) => {
      cache = policy;
      fetchedAt = Date.now();
      if (refresh) refreshedAt = fetchedAt;
      return cache;
    })
    .catch((error) => {
      // sem nativo (ou app nunca sincronizou): não bloqueia nada
      console.warn('[Evolve] falha ao ler política nativa', error);
      cache = cache ?? { keywords: [], blockedUrl: '' };
      return cache;
    });

  if (!refresh) return run;
  inFlightRefresh = run.finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message?.type === 'getPolicy') return loadPolicy(message.refresh === true);
  if (message?.type === 'invalidate') {
    fetchedAt = 0;
    refreshedAt = 0;
    return { ok: true };
  }
  return undefined;
});

// aquece o cache assim que o Safari carrega a extensão
void loadPolicy();
