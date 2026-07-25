/**
 * Diagnóstico da extensão, sem precisar de Mac nem console.
 *
 * Responde a UMA pergunta: a ponte nativa está entregando a política?
 * Se sim, mostra quantas palavras chegaram e quando o app sincronizou pela
 * última vez — o que separa "extensão sem permissão" de "app não sincronizou"
 * de "palavra não casou".
 */

const el = document.getElementById('state');

function render(html) {
  el.innerHTML = html;
}

(async () => {
  try {
    const policy = await browser.runtime.sendMessage({ type: 'invalidate' }).then(() =>
      browser.runtime.sendMessage({ type: 'getPolicy' }),
    );

    if (!policy) {
      render(
        '<span class="bad">Sem resposta do background.</span>' +
          '<ul><li>Recarregue a extensão nos Ajustes do Safari.</li></ul>',
      );
      return;
    }

    const keywords = policy.keywords ?? [];
    const updatedAt = policy.updatedAt
      ? new Date(policy.updatedAt).toLocaleString('pt-BR')
      : null;

    if (!updatedAt) {
      render(
        '<span class="bad">Ponte nativa respondeu, mas o app nunca sincronizou.</span>' +
          '<ul><li>Abra o app Evolve para gravar a política.</li></ul>',
      );
      return;
    }

    if (keywords.length === 0) {
      render(
        '<span class="ok">Ponte nativa OK.</span>' +
          `<ul><li>Sincronizado em ${updatedAt}</li>` +
          '<li>Nenhuma palavra ativa — cadastre uma que NÃO seja domínio.</li></ul>',
      );
      return;
    }

    render(
      '<span class="ok">Ativo.</span>' +
        `<ul><li>Sincronizado em ${updatedAt}</li>` +
        `<li>${keywords.length} palavra(s): ${keywords
          .map((k) => k.phrase)
          .join(', ')}</li>` +
        `<li>Destino: ${policy.blockedUrl || '(sem URL)'}</li></ul>`,
    );
  } catch (error) {
    render(
      `<span class="bad">Falha na ponte nativa.</span><ul><li>${String(error)}</li>` +
        '<li>É aqui que o identificador do sendNativeMessage entra em suspeita.</li></ul>',
    );
  }
})();
