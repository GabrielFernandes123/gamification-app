import { Text as RNText, type TextProps, StyleSheet } from 'react-native';

import { theme } from '@/theme/theme';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'bodyMedium'
  | 'bodyMuted'
  | 'label'
  | 'stat';

type Props = TextProps & {
  variant?: TextVariant;
  color?: string;
};

export function Text({ variant = 'body', color, style, ...rest }: Props) {
  return <RNText style={[styles[variant], color ? { color } : null, style]} {...rest} />;
}

const { colors, fonts, fontSizes } = theme;

const styles = StyleSheet.create({
  display: { fontFamily: fonts.headingBold, fontSize: fontSizes.display, color: colors.text },
  h1: { fontFamily: fonts.headingBold, fontSize: fontSizes.xxl, color: colors.text },
  h2: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.text },
  title: { fontFamily: fonts.bodySemibold, fontSize: fontSizes.lg, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.text, lineHeight: fontSizes.md * 1.5 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.text },
  bodyMuted: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textMuted, lineHeight: fontSizes.md * 1.5 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stat: { fontFamily: fonts.headingBold, fontSize: fontSizes.xl, color: colors.text },
});
