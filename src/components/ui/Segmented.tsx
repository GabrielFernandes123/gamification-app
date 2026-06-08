import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';
import { Text } from './Text';

export type SegOption<T extends string | number> = { value: T; label: string; color?: string };

type Props<T extends string | number> = {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  wrap?: boolean;
};

export function Segmented<T extends string | number>({ options, value, onChange, wrap }: Props<T>) {
  return (
    <View style={[styles.row, wrap && styles.wrap]}>
      {options.map((o) => {
        const selected = o.value === value;
        const tint = o.color ?? theme.colors.primary;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.item,
              { borderColor: selected ? tint : theme.colors.border },
              selected ? { backgroundColor: tint + '22' } : null,
            ]}
          >
            <Text variant="bodyMedium" color={selected ? tint : theme.colors.textMuted}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    padding: 3,
  },
  wrap: { flexWrap: 'wrap', gap: theme.spacing.xs },
  item: {
    minHeight: theme.sizes.touch,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
});
