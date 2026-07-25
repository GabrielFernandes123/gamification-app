/**
 * Cache da política, do lado da extensão.
 *
 * O content script não fala com o nativo direto (e nem deveria: cada página
 * pediria de novo). O background busca a política do handler nativo, guarda em
 * memória por um tempo curto e responde às páginas.
 *
 * A política vem do App Group, escrita pelo app a cada sync — então uma compra
 * feita na tela /blocked reflete aqui no próximo refresh, sem a extensão
 * precisar de rede nem de credencial.
 */

const TTL_MS = 60_000;

let cache = null;
let fetchedAt = 0;

async function loadPolicy() {
  const now = Date.now();
  if (cache && now - fetchedAt < TTL_MS) return cache;
  try {
    // o handler nativo devolve { policy: { keywords, blockedUrl } }
    const response = await browser.runtime.sendNativeMessage('application.id', {
      type: 'getPolicy',
    });
    cache = response?.policy ?? { keywords: [], blockedUrl: '' };
    fetchedAt = now;
  } catch (error) {
    // sem nativo (ou app nunca sincronizou): não bloqueia nada
    console.warn('[Evolve] falha ao ler política nativa', error);
    cache = cache ?? { keywords: [], blockedUrl: '' };
  }
  return cache;
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message?.type === 'getPolicy') return loadPolicy();
  if (message?.type === 'invalidate') {
    fetchedAt = 0;
    return { ok: true };
  }
  return undefined;
});

// aquece o cache assim que o Safari carrega a extensão
void loadPolicy();
