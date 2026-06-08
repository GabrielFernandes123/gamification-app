import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import { ATTRIBUTES, type AttributeKey } from '../attributes';

type Props = {
  value: AttributeKey | null;
  onChange: (key: AttributeKey) => void;
  label?: string;
};

/** Seletor do atributo que uma skill / divisão corporal alimenta (03 §3). */
export function AttributePicker({ value, onChange, label = 'Atributo' }: Props) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <View style={styles.row}>
        {ATTRIBUTES.map((attr) => {
          const active = value === attr.key;
          return (
            <Pressable
              key={attr.key}
              onPress={() => onChange(attr.key)}
              style={[styles.chip, active ? styles.chipOn : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${attr.label} — ${attr.hint}`}
            >
              <Text
                variant="bodyMedium"
                color={active ? theme.colors.textInverse : theme.colors.text}
              >
                {attr.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
});
