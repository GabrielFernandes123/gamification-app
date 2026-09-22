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
///
/// `type: "unlock"` PAGA a liberação daqui, com o token do aparelho. Antes a
/// compra só acontecia na tela /blocked do site, que usa a sessão do navegador —
/// e a aba privada do Safari não guarda sessão: era login a cada bloqueio.
///
/// `refresh: true` busca a política direto na API antes de responder. Sem isto
/// uma compra feita na tela /blocked só aparecia depois de o usuário abrir o
/// app Evolve: ele pagava, voltava para a página e caía no bloqueio de novo.
/// O token fica aqui no nativo (chave `safariAuth`, gravada pelo app).
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
  /// Precisa bater com o App Group configurado no plugin.
  static let appGroup = "group.com.gabriel.evolve"
  static let policyKey = "safariPolicy"
  static let authKey = "safariAuth"

  func beginRequest(with context: NSExtensionContext) {
    let item = context.inputItems.first as? NSExtensionItem
    let message = item?.userInfo?[SFExtensionMessageKey] as? [String: Any]
    let refresh = message?["refresh"] as? Bool ?? false

    let reply: ([String: Any]) -> Void = { payload in
      let response = NSExtensionItem()
      response.userInfo = [SFExtensionMessageKey: payload]
      context.completeRequest(returningItems: [response], completionHandler: nil)
    }
    let respond: ([String: Any]) -> Void = { policy in reply(["policy": policy]) }

    if message?["type"] as? String == "unlock" {
      Self.unlock(
        keywordId: message?["keywordId"] as? String ?? "",
        clientId: message?["clientId"] as? String,
        completion: reply)
      return
    }

    guard refresh else {
      respond(Self.readPolicy())
      return
    }
    Self.refreshPolicy { respond($0 ?? Self.readPolicy()) }
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

  /// Relê `/tracking/policy` e regrava `safariPolicy` com a MESMA regra do app
  /// (`writeSafariPolicy` em shieldSync.ts): só palavras que não são domínio e
  /// que não têm liberação viva. `nil` = sem rede/credencial; quem chama cai no
  /// que já estava salvo, que é o comportamento anterior.
  private static func refreshPolicy(completion: @escaping ([String: Any]?) -> Void) {
    guard let defaults = UserDefaults(suiteName: appGroup),
      let auth = defaults.dictionary(forKey: authKey),
      let apiUrl = auth["apiUrl"] as? String,
      let token = auth["token"] as? String,
      let url = URL(string: "\(apiUrl)/tracking/policy")
    else {
      completion(nil)
      return
    }

    var request = URLRequest(url: url, timeoutInterval: 4)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    URLSession.shared.dataTask(with: request) { data, response, error in
      guard error == nil,
        (response as? HTTPURLResponse)?.statusCode == 200,
        let data = data,
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      else {
        os_log("[Evolve] falha ao atualizar a política pela API")
        completion(nil)
        return
      }

      let now = Date()
      let unlocked = Set(
        (json["unlocks"] as? [[String: Any]] ?? []).compactMap { unlock -> String? in
          guard let key = unlock["target_key"] as? String,
            let raw = unlock["expires_at"] as? String,
            let expires = parseDate(raw),
            expires > now
          else { return nil }
          return key
        })

      let keywords = (json["keywords"] as? [[String: Any]] ?? []).compactMap {
        keyword -> [String: Any]? in
        guard let id = keyword["id"] as? String,
          let phrase = keyword["phrase"] as? String,
          !looksLikeDomain(phrase),
          !unlocked.contains("keyword:\(id)")
        else { return nil }
        var entry: [String: Any] = [
          "id": id,
          "phrase": phrase,
          // o PRÓXIMO preço (a escalada do dia já aplicada): é o que o servidor
          // vai cobrar, e a tela não tem como corrigir depois do toque
          "cost": (keyword["next_unlock_cost"] as? NSNumber)
            ?? (keyword["unlock_cost_gold"] as? NSNumber) ?? 0,
          "minutes": (keyword["unlock_minutes"] as? NSNumber) ?? 0,
        ]
        // Só quando existe: NSNull não é tipo de plist, e gravar a política com
        // ele no UserDefaults derrubaria a extensão.
        if let availableAt = keyword["unlock_available_at"] as? String {
          entry["availableAt"] = availableAt
        }
        return entry
      }

      var policy = readPolicy()
      policy["keywords"] = keywords
      policy["updatedAt"] = ISO8601DateFormatter().string(from: now)
      defaults.set(policy, forKey: policyKey)
      completion(policy)
    }.resume()
  }

  /// Compra a liberação de uma palavra na API e já regrava a política.
  ///
  /// Devolve `{ ok, message?, reason?, policy? }`. `reason: "noauth"` diz ao JS
  /// que não há token ainda (o app nunca sincronizou) e que o caminho é o site.
  /// O `clientId` torna o toque idempotente: repetir não cobra duas vezes.
  private static func unlock(
    keywordId: String, clientId: String?, completion: @escaping ([String: Any]) -> Void
  ) {
    guard let defaults = UserDefaults(suiteName: appGroup),
      let auth = defaults.dictionary(forKey: authKey),
      let apiUrl = auth["apiUrl"] as? String,
      let token = auth["token"] as? String,
      let url = URL(string: "\(apiUrl)/tracking/unlock"),
      !keywordId.isEmpty
    else {
      completion(["ok": false, "reason": "noauth"])
      return
    }

    var body: [String: Any] = ["target_type": "keyword", "target": keywordId]
    if let clientId = clientId { body["client_id"] = clientId }

    var request = URLRequest(url: url, timeoutInterval: 8)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: request) { data, response, error in
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
      guard error == nil, (200..<300).contains(status) else {
        // A API explica a recusa (sem ouro, em espera…) em `message`.
        let message = (json?["message"] as? String) ?? "Não deu para liberar agora."
        os_log("[Evolve] liberação recusada (%d)", status)
        completion(["ok": false, "message": message, "reason": status == 401 ? "noauth" : "api"])
        return
      }
      // Regrava a política já sem a palavra, para a recarga da página passar.
      refreshPolicy { policy in
        var payload: [String: Any] = ["ok": true]
        if let policy = policy { payload["policy"] = policy }
        if let paid = json?["gold_paid"] { payload["goldPaid"] = paid }
        completion(payload)
      }
    }.resume()
  }

  /// Espelha `looksLikeDomain` do app: "youtube.com" é domínio; "fofoca" não.
  private static func looksLikeDomain(_ phrase: String) -> Bool {
    let text = phrase.trimmingCharacters(in: .whitespaces).lowercased()
    return text.range(of: "^[a-z0-9-]+(\\.[a-z0-9-]+)+$", options: .regularExpression) != nil
  }

  /// A API devolve ISO 8601 com milissegundos (`toISOString`).
  private static func parseDate(_ raw: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: raw) { return date }
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: raw)
  }
}
