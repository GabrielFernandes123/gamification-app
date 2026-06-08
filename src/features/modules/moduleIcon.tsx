import {
  Dumbbell,
  Footprints,
  Repeat,
  Ruler,
  ScrollText,
  Swords,
  Target,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * Resolve o nome de ícone guardado no `module_registry` (texto) para o
 * componente Lucide. Fallback neutro para chaves desconhecidas.
 */
const ICONS: Record<string, LucideIcon> = {
  repeat: Repeat,
  dumbbell: Dumbbell,
  scroll: ScrollText,
  target: Target,
  ruler: Ruler,
  swords: Swords,
};

export function moduleIcon(name: string): LucideIcon {
  return ICONS[name] ?? Footprints;
}
