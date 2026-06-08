import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';

type Props = {
  icon: ReactNode;
  value: string | number;
  label: string;
  color?: string;
};

export function StatPill({ icon, value, label, color }: Props) {
  return (
    <View style={styles.pill}>
      {icon}
      <View>
        <Text variant="stat" color={color} style={styles.value}>
          {value}
        </Text>
        <Text variant="label">{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  value: { fontSize: theme.fontSizes.lg },
});
