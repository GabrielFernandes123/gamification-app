import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string; // barra lateral colorida (estado do hábito, etc.)
};

export function Card({ children, style, accent }: Props) {
  return (
    <View style={[styles.card, accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
});
