// Dark RPG palette based on OLED dark surfaces with vibrant game accents.
export const colors = {
  // surfaces
  bg: '#020617',
  surface: '#0F172A',
  surfaceAlt: '#1E293B',
  border: '#334155',

  // text
  text: '#F8FAFC',
  textMuted: '#CBD5E1',
  textInverse: '#020617',

  // brand / actions
  primary: '#F97316',
  primaryDim: '#431407',
  success: '#22C55E',

  // game stats
  xp: '#F5B301',
  gold: '#FACC15',
  essencia: '#A78BFA',
  hp: '#F87171',
  skill: '#22D3EE',
  skillAlt: '#3B82F6',

  // utilities
  overlay: 'rgba(2,6,23,0.78)',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
