import Foundation
import UserNotifications
import WidgetKit

/// Grava no widget o retrato do dia que chega dentro de cada push.
///
/// Roda num processo próprio a cada notificação VISÍVEL com `mutableContent`
/// — inclusive com o app fechado, que é justamente quando mais nada consegue
/// atualizar o widget. Não mexe no texto da notificação: só aproveita a
/// passagem.
///
/// O formato é o do expo-widgets (`WidgetObject.updateTimeline`): uma lista de
/// `{ timestamp (ms), props }` na chave `__expo_widgets_<nome>_timeline` do
/// UserDefaults do App Group, seguida de `reloadTimelines(ofKind:)`.
class NotificationService: UNNotificationServiceExtension {
  static let appGroup = "group.com.gabriel.evolve"
  static let widgetName = "TodayJourneyWidget"

  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    bestAttempt = request.content
    Self.writeWidget(from: request.content.userInfo)
    contentHandler(request.content)
  }

  /// O iOS avisa antes de encerrar a extensão: entrega a notificação como veio.
  override func serviceExtensionTimeWillExpire() {
    if let handler = contentHandler, let content = bestAttempt {
      handler(content)
    }
  }

  /// O Expo põe o `data` do push em `userInfo["body"]` — às vezes como
  /// dicionário, às vezes como texto JSON. Aceita os dois.
  static func payload(from userInfo: [AnyHashable: Any]) -> [String: Any]? {
    if let body = userInfo["body"] as? [String: Any] { return body }
    if let raw = userInfo["body"] as? String,
      let data = raw.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    {
      return object
    }
    if userInfo["widget"] != nil {
      var direct: [String: Any] = [:]
      for (key, value) in userInfo {
        if let key = key as? String { direct[key] = value }
      }
      return direct
    }
    return nil
  }

  static func writeWidget(from userInfo: [AnyHashable: Any]) {
    guard let data = payload(from: userInfo),
      let widget = data["widget"] as? [String: Any],
      let timeline = widget["timeline"] as? [[String: Any]],
      let defaults = UserDefaults(suiteName: appGroup)
    else { return }

    // O LAYOUT é gravado pelo app na primeira abertura. Sem ele o widget não
    // sabe desenhar, e gravar a linha do tempo só deixaria lixo no App Group.
    guard defaults.string(forKey: "__expo_widgets_\(widgetName)_layout") != nil else { return }

    let entries: [[String: Any]] = timeline.compactMap { entry in
      guard let timestamp = (entry["timestamp"] as? NSNumber)?.intValue,
        let props = entry["props"] as? [String: Any]
      else { return nil }
      return ["timestamp": timestamp, "props": sanitize(props)]
    }
    guard !entries.isEmpty else { return }

    defaults.set(entries, forKey: "__expo_widgets_\(widgetName)_timeline")
    WidgetCenter.shared.reloadTimelines(ofKind: widgetName)
  }

  /// Tira `NSNull` de qualquer nível: não é tipo de plist, e gravar um
  /// dicionário com ele no UserDefaults derrubaria a extensão.
  static func sanitize(_ value: Any) -> Any {
    if let dictionary = value as? [String: Any] {
      var clean: [String: Any] = [:]
      for (key, item) in dictionary where !(item is NSNull) {
        clean[key] = sanitize(item)
      }
      return clean
    }
    if let array = value as? [Any] {
      return array.filter { !($0 is NSNull) }.map { sanitize($0) }
    }
    return value
  }
}
