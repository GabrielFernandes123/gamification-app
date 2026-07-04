export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  pill: 999,
} as const;

export const sizes = {
  barHeight: 12,
  hudBarHeight: 14,
  touch: 44, // alvo mínimo de toque (acessibilidade)
  // Folga inferior para listas/scrolls das tabs: a tab bar flutuante ocupa
  // ~86px (altura 76 + margem 10); 120 garante que nada fique escondido.
  tabBarClearance: 120,
} as const;
