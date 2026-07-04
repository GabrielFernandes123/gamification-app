import { useProfile } from '@/features/character/hooks/useCharacter';
import { todayInTz, weekdayInTz } from '@/utils/date';

// Fallback enquanto o perfil não carregou: fuso do aparelho via Intl; se o Intl
// não estiver disponível, 'America/Sao_Paulo' (mesmo fallback da API).
const DEFAULT_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
})();

export function useTimezone() {
  const { data } = useProfile();
  return data?.timezone ?? DEFAULT_TZ;
}

export function useToday() {
  const { data, isLoading } = useProfile();
  const tz = data?.timezone ?? DEFAULT_TZ;
  // isReady: perfil carregado (fuso confiável) — telas podem esperar por isto.
  return { today: todayInTz(tz), weekday: weekdayInTz(tz), tz, isReady: !!data, isLoading };
}
