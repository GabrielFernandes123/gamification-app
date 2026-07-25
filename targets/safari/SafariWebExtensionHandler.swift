import SafariServices
import os.log

/// Ponte entre o JavaScript da extensão e o App Group.
///
/// O JS da extensão NUNCA recebe o token da API: ele pede a política aqui, e
/// este handler devolve apenas o que a página precisa para decidir — as frases
/// bloqueadas, o preço, e a URL da tela de compra. Quem cobra é a tela web, com
/// a sessão do usuário no navegador.
///
/// A política é escrita pelo app (chave `safariPolicy` do UserDefaults
/// compartilhado) a cada sincronização.
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
  /// Precisa bater com o App Group configurado no plugin.
  static let appGroup = "group.com.gabriel.evolve"
  static let policyKey = "safariPolicy"

  func beginRequest(with context: NSExtensionContext) {
    let response = NSExtensionItem()
    response.userInfo = [SFExtensionMessageKey: ["policy": Self.readPolicy()]]
    context.completeRequest(returningItems: [response], completionHandler: nil)
  }

  /// Devolve o dicionário salvo pelo app, ou um vazio seguro (nada bloqueado)
  /// quando o app ainda não sincronizou nenhuma vez.
  private static func readPolicy() -> [String: Any] {
    guard let defaults = UserDefaults(suiteName: appGroup),
      let policy = defaults.dictionary(forKey: policyKey)
    else {
      os_log("[Evolve] sem política no App Group ainda")
      return ["keywords": [], "blockedUrl": ""]
    }
    return policy
  }
}
