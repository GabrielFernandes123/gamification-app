import { useEffect } from 'react';

import TodayJourneyWidget from './TodayJourneyWidget';
import { EMPTY_TODAY_JOURNEY_WIDGET, type TodayJourneyWidgetProps } from './todayJourney';

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

export function clearTodayJourneyWidgetSnapshot() {
  updateTodayJourneyWidgetSnapshot(EMPTY_TODAY_JOURNEY_WIDGET);
}

export function useTodayJourneyWidget(snapshot: TodayJourneyWidgetProps | null) {
  useEffect(() => {
    if (!snapshot) return;
    updateTodayJourneyWidgetSnapshot(snapshot);
  }, [snapshot]);
}
