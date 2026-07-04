export const colors = {
  bg: '#020617',
  bgElevated: '#07111F',
  surface: '#0B1220',
  surfaceAlt: '#111C2E',
  surfaceSoft: '#17243A',
  border: 'rgba(148,163,184,0.22)',
  borderStrong: 'rgba(249,115,22,0.42)',

  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  textInverse: '#020617',

  primary: '#F97316',
  primaryBright: '#FDBA74',
  primaryDim: '#431407',
  success: '#22C55E',
  danger: '#FB7185',

  xp: '#F5B301',
  gold: '#FACC15',
  essencia: '#A78BFA',
  hp: '#F87171',
  skill: '#22D3EE',
  skillAlt: '#3B82F6',
  mana: '#38BDF8',
  poison: '#A3E635',

  overlay: 'rgba(2,6,23,0.82)',
  glass: 'rgba(15,23,42,0.78)',
  glow: 'rgba(249,115,22,0.16)',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
