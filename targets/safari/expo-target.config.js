/**
 * Extensão do Safari — bloqueio por PALAVRA-CHAVE.
 *
 * Complementa o filtro de conteúdo do Screen Time: aquele bloqueia por domínio
 * em todos os navegadores, este pega termo dentro da URL (busca, caminho), o que
 * nenhuma API de domínio consegue.
 *
 * Precisa apenas do App Group: a política é lida de lá pelo handler nativo, de
 * forma que nenhum token de API chega ao contexto da página.
 *
 * @type {import('@kingstinct/expo-apple-targets/build/config-plugin').ConfigFunction}
 */
module.exports = () => ({
  type: 'safari',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.gabriel.evolve'],
  },
});
