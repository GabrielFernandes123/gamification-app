import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCompleteHabit } from '@/features/habits/hooks/useHabitMutations';
import { useToday } from '@/hooks/useToday';
import { HABIT_ACTION_DONE } from './categories';

/**
 * TRATA O BOTÃO "FEITO" DA NOTIFICAÇÃO (APP-SIMPLIFICACAO §4.4).
 *
 * ── A guarda de DIA, que é o coração disto ───────────────────────────────
 * Com `opensAppToForeground: false`, o JS só roda se o processo estiver vivo. Se o
 * app tiver sido encerrado, a resposta é entregue na PRÓXIMA abertura — que pode
 * ser na manhã seguinte. Marcar o hábito ali gravaria o dia errado: o registro
 * cairia em hoje, sobre um aviso de ontem.
 *
 * Por isso o servidor manda o `day` no payload e aqui ele é comparado com o dia
 * atual NO FUSO DO USUÁRIO (`useToday`, a mesma fonte que as telas usam). Fora do
 * dia, a ação é descartada em silêncio — o aviso já perdeu a validade, e o
 * usuário não pediu para marcar nada hoje.
 *
 * ── Por que o feedback aparece mesmo assim ──────────────────────────────
 * Doc 08 §0.2: mecânica que multiplica XP/ouro/dano aparece onde o efeito
 * acontece. Se o app estiver aberto quando a ação chega, o toast mostra o ganho —
 * é o mesmo retorno do toque no `HabitRow`, e sem ele o hábito seria marcado sem
 * o jogador ver o efeito.
 */
export function useNotificationActions() {
  const complete = useCompleteHabit();
  const toast = useToast();
  const { today, isReady } = useToday();
  // Uma resposta pode chegar pelos DOIS caminhos (o listener e o
  // `useLastNotificationResponse` na abertura). O id da notificação já tratada
  // impede marcar duas vezes o mesmo aviso.
  const tratadas = useRef(new Set<string>());
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    // Sem fuso confiável não há como comparar o dia — esperar é mais correto que
    // arriscar marcar fora da janela.
    if (!isReady) return;

    function tratar(response: Notifications.NotificationResponse) {
      if (response.actionIdentifier !== HABIT_ACTION_DONE) return;
      const id = response.notification.request.identifier;
      if (tratadas.current.has(id)) return;

      const data = response.notification.request.content.data as
        | { habitId?: string; habitName?: string; day?: string }
        | undefined;
      const habitId = data?.habitId;
      if (typeof habitId !== 'string') return;

      // A guarda: aviso de ontem não marca hoje.
      if (typeof data?.day === 'string' && data.day !== today) {
        tratadas.current.add(id);
        toast.info(
          'Aviso vencido',
          `O lembrete de "${data.habitName ?? 'hábito'}" era de ${data.day}.`,
        );
        return;
      }

      tratadas.current.add(id);
      complete.mutate(
        { habitId },
        {
          onSuccess: (result) => {
            const partes = [
              result.xpGained ? `+${result.xpGained} XP` : null,
              result.goldGained ? `+${result.goldGained} de ouro` : null,
            ].filter(Boolean);
            toast.success(
              data?.habitName ? `${data.habitName} ✓` : 'Hábito marcado',
              partes.join(' · ') || undefined,
            );
          },
          onError: () => {
            // Devolve o id à fila: falha de rede não pode consumir a ação.
            tratadas.current.delete(id);
            toast.error('Não deu para marcar', 'Abra o app e registre.');
          },
        },
      );
    }

    // Caminho 1: app vivo (primeiro plano ou acordado em segundo plano).
    const sub = Notifications.addNotificationResponseReceivedListener(tratar);
    // Caminho 2: o app estava encerrado e abriu por causa da ação.
    if (lastResponse) tratar(lastResponse);
    return () => sub.remove();
  }, [complete, isReady, lastResponse, today, toast]);
}
