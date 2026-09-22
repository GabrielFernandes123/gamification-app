/**
 * Extensão de NOTIFICAÇÃO — atualiza o widget com o app fechado.
 *
 * O iOS não acorda um app que foi fechado (deslizado para cima): nem tarefa em
 * segundo plano, nem push silencioso. Mas esta extensão roda a cada push
 * VISÍVEL que chega com `mutableContent`, num processo próprio, com o app
 * aberto, em segundo plano ou fechado. A API manda o retrato do widget dentro
 * de todo push (ver `common/push-enrichment.ts` na API), e aqui ele é gravado
 * no App Group, no mesmo formato que o expo-widgets usa.
 *
 * Precisa só do App Group — o mesmo do widget e das outras extensões.
 *
 * Assinatura: as credenciais do projeto são LOCAIS (eas.json, preview), então
 * esta extensão precisa de App ID e perfil próprios no portal da Apple — ver
 * docs/13-ios-build-e-apple.md.
 *
 * @type {import('@kingstinct/expo-apple-targets/build/config-plugin').ConfigFunction}
 */
module.exports = () => ({
  type: 'notification-service',
  name: 'NotificationService',
  bundleIdentifier: '.notification',
  frameworks: ['UserNotifications', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': ['group.com.gabriel.evolve'],
  },
});
