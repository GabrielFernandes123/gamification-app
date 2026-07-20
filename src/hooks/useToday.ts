import { useProfile } from '@/features/character/hooks/useCharacter';
import { todayInTz, weekdayInTz } from '@/utils/date';

// Fallback enquanto o perfil não carregou: SEMPRE o fuso do aparelho.
// Nunca cair num fuso fixo: um fallback 'America/Sao_Paulo' (UTC-3) num
// aparelho em UTC-4 faz o dia virar às 21h locais — a tela passa a pedir D+1,
// a API responde vazio e os hábitos já marcados aparecem desmarcados.
// Sem Intl não há como saber o fuso do usuário, então usamos a data local do
// aparelho (todayInTz trata '' caindo no fallback local, não em UTC).
const DEFAULT_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
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
