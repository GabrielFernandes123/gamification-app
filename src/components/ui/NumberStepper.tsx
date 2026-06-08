import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { theme } from '@/theme/theme';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  accessibilityLabel?: string;
};

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  accessibilityLabel,
}: Props) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  function clamp(next: number) {
    if (!Number.isFinite(next)) return min;
    return Math.min(max, Math.max(min, Math.round(next)));
  }

  function commit(text = draft) {
    const normalized = text.replace(/\D/g, '');
    const next = normalized ? clamp(Number(normalized)) : min;
    setEditing(false);
    setDraft(String(next));
    onChange(next);
  }

  function changeBy(delta: number) {
    const next = clamp(value + delta);
    setDraft(String(next));
    onChange(next);
  }

  return (
    <View style={styles.wrap} accessibilityLabel={accessibilityLabel}>
      <Pressable
        onPress={() => changeBy(-step)}
        style={[styles.btn, value <= min && styles.btnDisabled]}
        accessibilityLabel="Diminuir"
        accessibilityRole="button"
        disabled={value <= min}
        hitSlop={6}
      >
        <Minus color={value <= min ? theme.colors.textMuted : theme.colors.text} size={18} />
      </Pressable>

      <TextInput
        value={editing ? draft : String(value)}
        onFocus={() => {
          setEditing(true);
          setDraft(String(value));
        }}
        onChangeText={(text) => setDraft(text.replace(/\D/g, ''))}
        onBlur={() => commit()}
        onSubmitEditing={() => commit()}
        keyboardType="number-pad"
        selectTextOnFocus
        style={styles.input}
        placeholder="0"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={accessibilityLabel ?? 'Valor'}
      />

      <Pressable
        onPress={() => changeBy(step)}
        style={[styles.btn, value >= max && styles.btnDisabled]}
        accessibilityLabel="Aumentar"
        accessibilityRole="button"
        disabled={value >= max}
        hitSlop={6}
      >
        <Plus color={value >= max ? theme.colors.textMuted : theme.colors.text} size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: theme.sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  btn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  input: {
    flex: 1,
    minWidth: 92,
    height: theme.sizes.touch,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontFamily: theme.fonts.headingBold,
    fontSize: theme.fontSizes.xl,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
