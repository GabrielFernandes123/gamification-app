import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { registerNotificationCategories } from './categories';
import { ensureNotificationPermissions } from './permissions';
import { registerPushToken } from './pushToken';

/**
 * O que o app faz de notificação: **registrar o token e mostrar o que chega.**
 *
 * Nada mais. Quem decide o que avisar, quando, e agrupado como, é o servidor
 * (`gamificacao-api/src/notifications/`, doc 14 §12).
 *
 * ── Por que o agendamento local saiu ────────────────────────────────────
 * Notificação local repetente dispara pelo relógio do iOS e **não consegue
 * consultar estado**. Era por isso que o app avisava hábito já concluído: no
 * instante do alarme, ninguém pergunta ao banco se ainda está pendente. Não era
 * um bug para consertar aqui — era o teto da abordagem.
 *
 * Efeito colateral bom: agrupar. O servidor sabe que são três hábitos e manda
 * UMA mensagem; o agendador local mandava três, uma por hábito, no mesmo minuto.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotificationSync() {
  useEffect(() => {
    void (async () => {
      const granted = await ensureNotificationPermissions();
      if (!granted) return;
      await registerPushToken();

      // As categorias de AÇÃO (os botões da notificação) precisam estar
      // registradas ANTES de a notificação chegar — o iOS resolve o
      // `categoryIdentifier` no momento da entrega, e categoria desconhecida
      // simplesmente não mostra botão. Registrar a cada abertura é o mais
      // barato: é idempotente por identificador.
      await registerNotificationCategories();

      // Limpa o que a versão anterior deixou agendado. Sem isto, quem já tem o
      // app instalado continuaria recebendo os alarmes locais antigos para
      // sempre — agora somados aos do servidor.
      await Notifications.cancelAllScheduledNotificationsAsync().catch(
        () => undefined,
      );
    })();
  }, []);
}
