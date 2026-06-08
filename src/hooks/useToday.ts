import { useProfile } from '@/features/character/hooks/useCharacter';
import { todayInTz, weekdayInTz } from '@/utils/date';

const DEFAULT_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Cuiaba';

export function useTimezone() {
  const { data } = useProfile();
  return data?.timezone ?? DEFAULT_TZ;
}

export function useToday() {
  const tz = useTimezone();
  return { today: todayInTz(tz), weekday: weekdayInTz(tz), tz };
}
