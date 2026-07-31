import * as Notifications from 'expo-notifications';

/**
 * AÇÕES NA NOTIFICAÇÃO (análise de simplificação do app (2026-07-30) §4.4).
 *
 * "Registrar sem abrir o app" vale mais que qualquer tela interna num app de
 * bolso: a notificação chega, o hábito é marcado e o telefone volta ao bolso.
 *
 * ── Uma categoria só, e o porquê ─────────────────────────────────────────
 * `habit-single` existe apenas para o aviso de UM hábito pendente. Com três, o
 * servidor não manda categoria nenhuma (ver `notifications.service`): "Feito"
 * marcaria qual? Registrar por conta própria algo que o usuário não escolheu é
 * pior que exigir um toque a mais.
 *
 * ── `opensAppToForeground: false` ────────────────────────────────────────
 * É o que faz o botão resolver sem trazer o app para a frente. A contrapartida é
 * que o JS só roda se o processo estiver vivo; se o app tiver sido encerrado, a
 * resposta chega na próxima abertura (`useLastNotificationResponse`). Por isso o
 * payload carrega o DIA: aplicar na manhã seguinte marcaria a data errada, e é a
 * guarda que impede isso (ver `useNotificationActions`).
 *
 * Sem `:` nem `-`... o doc da SDK 56 pede para evitar esses caracteres no
 * identificador de categoria; `habit-single` usa hífen, então o identificador
 * real é `habitSingle`.
 */
export const HABIT_CATEGORY = 'habitSingle';

/** Os identificadores das ações, um por botão. */
export const HABIT_ACTION_DONE = 'habitDone';
export const HABIT_ACTION_SNOOZE = 'habitSnooze';

/**
 * Registra as categorias. Idempotente por identificador — chamar de novo
 * sobrescreve a mesma categoria, então não há acúmulo entre aberturas.
 */
export async function registerNotificationCategories(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync(HABIT_CATEGORY, [
      {
        identifier: HABIT_ACTION_DONE,
        buttonTitle: 'Feito',
        // O ponto inteiro do recurso: marcar sem abrir o app.
        options: { opensAppToForeground: false },
      },
      {
        identifier: HABIT_ACTION_SNOOZE,
        buttonTitle: 'Ver no app',
        // Este ABRE de propósito — é o caminho para quem quer decidir olhando.
        options: { opensAppToForeground: true },
      },
    ]);
  } catch {
    // Categoria é enfeite funcional: sem ela a notificação continua sendo um
    // toque que abre o app. Falhar aqui não pode derrubar a inicialização.
  }
}
