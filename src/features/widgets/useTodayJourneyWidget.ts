import { useEffect } from 'react';

import TodayJourneyWidget from './TodayJourneyWidget';
import { EMPTY_TODAY_JOURNEY_WIDGET, type TodayJourneyWidgetProps } from './todayJourney';

export function updateTodayJourneyWidgetSnapshot(snapshot: TodayJourneyWidgetProps) {
  try {
    TodayJourneyWidget.updateSnapshot(snapshot);
  } catch {
    // Widgets sao iOS/development-build only; falhar aqui nao deve quebrar o app.
  }
}

export function clearTodayJourneyWidgetSnapshot() {
  updateTodayJourneyWidgetSnapshot(EMPTY_TODAY_JOURNEY_WIDGET);
}

export function useTodayJourneyWidget(snapshot: TodayJourneyWidgetProps | null) {
  useEffect(() => {
    updateTodayJourneyWidgetSnapshot(snapshot ?? EMPTY_TODAY_JOURNEY_WIDGET);
  }, [snapshot]);
}
