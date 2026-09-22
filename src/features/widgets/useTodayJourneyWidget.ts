import TodayJourneyWidget from './TodayJourneyWidget';
import {
  EMPTY_TODAY_JOURNEY_WIDGET,
  type TodayJourneyTimelineEntry,
  type TodayJourneyWidgetProps,
} from './todayJourney';

export function updateTodayJourneyWidgetSnapshot(snapshot: TodayJourneyWidgetProps) {
  try {
    TodayJourneyWidget.updateSnapshot(snapshot);
  } catch (err) {
    // Widgets sao iOS/development-build only; falhar aqui nao deve quebrar o app.
    // Mas engolir o erro em silencio torna a widget impossivel de diagnosticar:
    // se a escrita falha, ela fica no placeholder ("loading") para sempre.
    console.warn('[widget] updateSnapshot falhou:', err);
  }
}

/**
 * Grava a LINHA DO TEMPO que a API montou (agora, hora de fechar o dia,
 * meia-noite). Entradas do passado saem: a primeira fica sendo a do agora.
 */
export function writeTodayJourneyTimeline(entries: TodayJourneyTimelineEntry[]) {
  const agora = Date.now();
  const futuras = entries.filter((entry) => entry.timestamp > agora);
  const atual = [...entries].reverse().find((entry) => entry.timestamp <= agora) ?? entries[0];
  const linha = [atual, ...futuras.filter((entry) => entry !== atual)];
  try {
    TodayJourneyWidget.updateTimeline(
      linha.map((entry) => ({ date: new Date(entry.timestamp), props: entry.props })),
    );
  } catch (err) {
    console.warn('[widget] updateTimeline falhou:', err);
    // Sem linha do tempo, ao menos o retrato de agora.
    updateTodayJourneyWidgetSnapshot(atual.props);
  }
}

export function clearTodayJourneyWidgetSnapshot() {
  updateTodayJourneyWidgetSnapshot(EMPTY_TODAY_JOURNEY_WIDGET);
}
