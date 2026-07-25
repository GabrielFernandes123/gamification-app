/**
 * Interceptação por palavra-chave.
 *
 * Roda em `document_start` — antes do conteúdo aparecer — e compara a URL com as
 * frases bloqueadas. Casou: troca a navegação pela tela de compra da web, que
 * cobra o ouro com a sessão do usuário e devolve para cá.
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

(async () => {
  if (location.href.length > MAX_URL_LENGTH) return;

  const policy = await browser.runtime.sendMessage({ type: 'getPolicy' }).catch(() => null);
  const keywords = policy?.keywords ?? [];
  const blockedUrl = policy?.blockedUrl;
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
  const hit = keywords.find((keyword) => haystack.includes(normalize(String(keyword.phrase))));
  if (!hit) return;

  // Mesmos parâmetros que a extensão do Chrome monta (background/enforcer.ts),
  // para a rota /blocked servir os dois clientes sem ramificação.
  const params = new URLSearchParams({
    type: 'keyword',
    target: hit.id,
    label: hit.phrase,
    cost: String(hit.cost ?? 0),
    minutes: String(hit.minutes ?? 0),
    url: location.href,
  });

  location.replace(`${blockedUrl}?${params.toString()}`);
})();
