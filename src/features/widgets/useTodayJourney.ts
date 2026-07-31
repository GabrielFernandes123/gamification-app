import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

import { useTodayJourneyWidget } from './useTodayJourneyWidget';
import type { TodayJourneyAction, TodayJourneyWidgetProps } from './todayJourney';

/**
 * O widget do iPhone, alimentado por `GET /today`.
 *
 * Antes o snapshot era montado **dentro da Início**, a partir das nove queries
 * que a tela fazia. Quando a Início encolheu para só as decisões do dia (doc 08
 * §0), esse acoplamento virou um problema de duas pontas:
 *
 * - a tela não tinha mais por que buscar objetivos, temporada e treinos;
 * - e o widget só atualizava se você abrisse **aquela aba** — abrir o app
 *   direto em Hábitos deixava a tela de bloqueio mostrando ontem.
 *
 * Por isso o hook mora no layout das abas, não numa tela: qualquer entrada no
 * app atualiza o widget. E por isso o cálculo mora no servidor: contar o dia é
 * regra de negócio, e uma segunda implementação no cliente divergiria da que
 * paga XP (doc 08 §0.2).
 *
 * O que sobra aqui é **texto** — os rótulos são apresentação, e apresentação é
 * do cliente.
 */

export type TodaySnapshot = {
  day: string;
  character: {
    level: number;
    hp: number;
    maxHp: number;
    xpIntoLevel: number;
    xpLevelSpan: number;
    gold: number;
    essence: number;
    streak: number;
  };
  habits: {
    due: number;
    completed: number;
    completion: number;
    next: { id: string; name: string }[];
  };
  totals: { xp: number; gold: number; failed: number };
  objectives: { claimable: number; atRisk: number };
  boss: { name: string; hp: number; maxHp: number };
  body: { lastWorkoutDays: number | null };
};

export function useTodaySnapshot() {
  return useQuery({
    queryKey: qk.today,
    queryFn: () => apiFetch<TodaySnapshot>('/today'),
  });
}

/** Monta e publica o snapshot. Chamado uma vez, no layout das abas. */
export function useTodayJourneySync() {
  const today = useTodaySnapshot();
  const snapshot = useMemo(
    () => (today.data ? toWidgetProps(today.data) : null),
    [today.data],
  );
  useTodayJourneyWidget(snapshot);
}

function toWidgetProps(today: TodaySnapshot): TodayJourneyWidgetProps {
  const status = describeStatus(today);
  return {
    statusLabel: status.label,
    statusDetail: status.detail,
    completion: today.habits.completion,
    completedHabits: today.habits.completed,
    dueHabits: today.habits.due,
    xpToday: today.totals.xp,
    goldToday: today.totals.gold,
    failedToday: today.totals.failed,
    level: today.character.level,
    hp: today.character.hp,
    maxHp: today.character.maxHp,
    xpIntoLevel: today.character.xpIntoLevel,
    xpLevelSpan: today.character.xpLevelSpan,
    streak: today.character.streak,
    gold: today.character.gold,
    essence: today.character.essence,
    claimableObjectives: today.objectives.claimable,
    atRiskObjectives: today.objectives.atRisk,
    bossName: today.boss.name,
    bossHp: today.boss.hp,
    bossMaxHp: today.boss.maxHp,
    actions: buildActions(today),
    updatedAt: new Date().toISOString(),
  };
}

/** A manchete do widget: o que exige atenção primeiro. */
function describeStatus(today: TodaySnapshot): { label: string; detail: string } {
  const { claimable, atRisk } = today.objectives;
  if (claimable > 0) {
    return {
      label: 'Recompensa disponível',
      detail: `${claimable} objetivo${claimable === 1 ? '' : 's'} aguardando resgate`,
    };
  }
  if (atRisk > 0) {
    return {
      label: 'Zona de risco',
      detail: `${atRisk} compromisso${atRisk === 1 ? '' : 's'} pedindo atenção`,
    };
  }
  if (today.habits.due > 0 && today.habits.completion >= 1) {
    return {
      label: 'Dia dominado',
      detail: 'Todas as ações principais foram concluídas',
    };
  }
  return {
    label: 'Em progresso',
    detail: 'Complete a próxima ação para avançar a jornada',
  };
}

/** Até cinco linhas — o widget é pequeno, e o que não cabe vira ruído. */
function buildActions(today: TodaySnapshot): TodayJourneyAction[] {
  const actions: TodayJourneyAction[] = [];

  for (const habit of today.habits.next) {
    actions.push({
      id: `habit-${habit.id}`,
      label: habit.name,
      detail: 'Próximo foco',
      tone: 'warning',
    });
  }

  if (today.objectives.claimable > 0) {
    actions.push({
      id: 'claimable-objectives',
      label: `${today.objectives.claimable} recompensa${today.objectives.claimable === 1 ? '' : 's'}`,
      detail: 'Resgate disponível',
      tone: 'success',
    });
  }

  if (today.objectives.atRisk > 0) {
    actions.push({
      id: 'at-risk-objectives',
      label: `${today.objectives.atRisk} compromisso${today.objectives.atRisk === 1 ? '' : 's'} em risco`,
      detail: 'Prioridade alta',
      tone: 'danger',
    });
  }

  const stale = today.body.lastWorkoutDays;
  if (stale !== null && stale >= 3) {
    actions.push({
      id: 'workout-stale',
      label: 'Treino atrasado',
      detail: `${stale}d sem treino`,
      tone: 'magic',
    });
  }

  if (actions.length === 0 && today.habits.due > 0) {
    actions.push({
      id: 'clean-day',
      label: 'Dia dominado',
      detail: 'Todas as ações principais foram feitas',
      tone: 'success',
    });
  }

  return actions.slice(0, 5);
}
