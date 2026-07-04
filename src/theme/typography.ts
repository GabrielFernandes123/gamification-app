// Nomes batem com os exports de @expo-google-fonts/barlow* (string = chave do useFonts).
export const fonts = {
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemibold: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
  // Barlow Condensed para números/stats/títulos (vibe RPG/esporte)
  heading: 'BarlowCondensed_600SemiBold',
  headingBold: 'BarlowCondensed_700Bold',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 21,
  xxl: 27,
  display: 38,
} as const;

export type FontKey = keyof typeof fonts;
export type FontSizeKey = keyof typeof fontSizes;
