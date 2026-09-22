/**
 * Interceptação por palavra-chave.
 *
 * Roda em `document_start` — antes do conteúdo aparecer — e compara a URL com as
 * frases bloqueadas. Casou: para a página e mostra a tela de bloqueio nela
 * mesma, com o pagamento feito pelo handler nativo (sem login no site).
 *
 * Por que na URL e não no texto da página: é o mesmo critério que a extensão do
 * Chrome já usa (`url + title`), então o comportamento fica consistente entre PC
 * e iPhone. Ler o texto renderizado exigiria esperar o DOM, o que mostraria o
 * conteúdo antes de bloquear — o oposto do objetivo.
 */

/** Teto defensivo: se algo escapar, não deixa a URL crescer sem limite. */
const MAX_URL_LENGTH = 2000;

/** Faixa de diacríticos combinantes (após NFD). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Normaliza a URL para comparar com a frase.
 *
 * Buscas trazem a frase codificada (`q=thayse+teixeira`, `%20`, acentos em
 * percent-encoding), então comparar com a URL crua faria qualquer frase com
 * espaço nunca casar. Aqui a URL é decodificada, `+` vira espaço e os acentos
 * são removidos.
 */
function normalize(value) {
  let text = value;
  try {
    text = decodeURIComponent(value);
  } catch {
    // percent-encoding inválido: segue com o valor cru
  }
  return text.toLowerCase().replace(/\+/g, ' ').normalize('NFD').replace(COMBINING_MARKS, '');
}

function getPolicy(refresh) {
  return browser.runtime.sendMessage({ type: 'getPolicy', refresh }).catch(() => null);
}

/** Primeira palavra da política que casa com a URL, ou `undefined`. */
function findHit(policy, haystack) {
  return (policy?.keywords ?? []).find((keyword) =>
    haystack.includes(normalize(String(keyword.phrase))),
  );
}

(async () => {
  if (location.href.length > MAX_URL_LENGTH) return;

  const cached = await getPolicy(false);
  const keywords = cached?.keywords ?? [];
  const blockedUrl = cached?.blockedUrl;
  if (keywords.length === 0 || !blockedUrl) return;

  // NUNCA policiar o próprio Evolve. A tela /blocked carrega a frase nos seus
  // próprios parâmetros, então sem esta guarda ela casaria consigo mesma e
  // entraria em loop de redirecionamento, aninhando a URL até estourar.
  let blockedOrigin;
  try {
    blockedOrigin = new URL(blockedUrl).origin;
  } catch {
    return; // blockedUrl inválida: melhor não bloquear nada
  }
  if (location.origin === blockedOrigin) return;

  const haystack = normalize(location.href);
  if (!findHit(cached, haystack)) return;

  // Casou no cache: confirma no servidor antes de bloquear. A liberação comprada
  // na tela /blocked só existe lá até o app sincronizar — sem esta releitura a
  // volta da compra caía no bloqueio de novo. Sem rede, o nativo devolve o cache.
  const fresh = await getPolicy(true);
  const hit = findHit(fresh ?? cached, haystack);
  if (!hit) return;

  // PAGAR AQUI, SEM LOGIN. Antes a interceptação trocava a navegação pela tela
  // /blocked do site, que cobra com a sessão do navegador — e a aba privada do
  // Safari não tem sessão: era login a cada bloqueio. Agora a página para de
  // carregar e a tela de bloqueio nasce DENTRO dela; quem cobra é o handler
  // nativo, com o token do aparelho que o app gravou no App Group (o JS da
  // página nunca vê esse token). Sem token, cai no site como antes.
  window.stop();
  showBlock(hit, blockedUrl);
})();

/** Mesmos parâmetros que a extensão do Chrome monta, para a rota /blocked. */
function siteUrl(hit, blockedUrl) {
  const params = new URLSearchParams({
    type: 'keyword',
    target: hit.id,
    label: hit.phrase,
    cost: String(hit.cost ?? 0),
    minutes: String(hit.minutes ?? 0),
    url: location.href,
  });
  return `${blockedUrl}?${params.toString()}`;
}

function newClientId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // fallback RFC 4122 v4 — o servidor exige UUID para deduplicar o toque
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function showBlock(hit, blockedUrl) {
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'closed' });
  const cost = Number(hit.cost ?? 0);
  const minutes = Number(hit.minutes ?? 0);
  const availableAt = hit.availableAt ? new Date(hit.availableAt) : null;
  const inCooldown = availableAt !== null && availableAt.getTime() > Date.now();
  const hhmm = (d) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  root.innerHTML = `
    <style>
      .bg { position: fixed; inset: 0; background: #020617; color: #f8fafc;
            font: 16px -apple-system, system-ui, sans-serif; display: flex;
            align-items: center; justify-content: center; padding: 24px; }
      .card { max-width: 360px; width: 100%; text-align: center; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      p { color: #94a3b8; margin: 0 0 20px; line-height: 1.45; }
      button, a { display: block; width: 100%; box-sizing: border-box; border: 0;
                  border-radius: 12px; padding: 14px; font-size: 16px; margin-top: 10px;
                  text-decoration: none; font-weight: 600; }
      .pay { background: #f97316; color: #020617; }
      .pay[disabled] { opacity: .5; }
      .back { background: #111c2e; color: #f8fafc; }
      .site { background: transparent; color: #94a3b8; font-weight: 400; font-size: 14px; }
      .err { color: #fb7185; min-height: 20px; margin: 12px 0 0; }
    </style>
    <div class="bg"><div class="card">
      <h1>Bloqueado pelo Evolve</h1>
      <p></p>
      <button class="pay"></button>
      <button class="back">Voltar</button>
      <a class="site" hidden>Pagar pelo site</a>
      <div class="err"></div>
    </div></div>`;

  const text = root.querySelector('p');
  const pay = root.querySelector('.pay');
  const back = root.querySelector('.back');
  const site = root.querySelector('.site');
  const err = root.querySelector('.err');

  text.textContent = `"${hit.phrase}" está na sua lista. Liberar esta página por ${minutes} min custa ${cost} de ouro.`;
  if (inCooldown) {
    pay.textContent = `Nova liberação às ${hhmm(availableAt)}`;
    pay.disabled = true;
  } else {
    pay.textContent = cost > 0 ? `Pagar ${cost} de ouro e liberar` : `Liberar por ${minutes} min`;
  }
  site.href = siteUrl(hit, blockedUrl);

  back.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.replace('about:blank');
  });

  pay.addEventListener('click', async () => {
    pay.disabled = true;
    err.textContent = '';
    try {
      const result = await browser.runtime.sendMessage({
        type: 'unlock',
        keywordId: hit.id,
        clientId: newClientId(),
      });
      if (result?.ok) {
        // A liberação já está no servidor e na política nativa: recarregar
        // passa pela checagem de novo e agora ela deixa passar.
        location.reload();
        return;
      }
      if (result?.reason === 'noauth') {
        // App ainda não gravou o token do aparelho: o caminho antigo resolve.
        location.replace(site.href);
        return;
      }
      err.textContent = result?.message || 'Não deu para liberar agora.';
      site.hidden = false;
      pay.disabled = false;
    } catch {
      err.textContent = 'Sem resposta do Evolve.';
      site.hidden = false;
      pay.disabled = false;
    }
  });

  (document.documentElement || document).appendChild(host);
}
