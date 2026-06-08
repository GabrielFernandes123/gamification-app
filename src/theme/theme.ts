import { colors } from './colors';
import { spacing, radius, sizes } from './spacing';
import { fonts, fontSizes } from './typography';

// Tema dark único (sem alternância). Estático — exposto via useTheme() para
// manter uma API estável caso futuramente vire dinâmico.
export const theme = {
  colors,
  spacing,
  radius,
  sizes,
  fonts,
  fontSizes,
} as const;

export type Theme = typeof theme;

export function useTheme(): Theme {
  return theme;
}
