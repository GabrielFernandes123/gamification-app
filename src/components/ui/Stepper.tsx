import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';
import { Text } from './Text';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
};

export function Stepper({ value, onChange, min = 1, max = 99 }: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <View style={styles.row}>
      <Pressable onPress={dec} style={styles.btn} accessibilityLabel="Diminuir" hitSlop={6}>
        <Minus color={theme.colors.text} size={18} />
      </Pressable>
      <Text variant="stat" style={styles.value}>
        {value}
      </Text>
      <Pressable onPress={inc} style={styles.btn} accessibilityLabel="Aumentar" hitSlop={6}>
        <Plus color={theme.colors.text} size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  btn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 32, textAlign: 'center' },
});
