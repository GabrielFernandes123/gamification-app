import { useEffect } from 'react';

import TodayJourneyWidget from './TodayJourneyWidget';
import { EMPTY_TODAY_JOURNEY_WIDGET, type TodayJourneyWidgetProps } from './todayJourney';

export function useTodayJourneyWidget(snapshot: TodayJourneyWidgetProps | null) {
  useEffect(() => {
    try {
      TodayJourneyWidget.updateSnapshot(snapshot ?? EMPTY_TODAY_JOURNEY_WIDGET);
    } catch {
      // Widgets sao iOS/development-build only; falhar aqui nao deve quebrar o app.
    }
  }, [snapshot]);
}
