import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';
import { Text } from './Text';

type Variant = 'primary' | 'success' | 'danger' | 'ghost' | 'outline';
type Size = 'md' | 'sm';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

const BG: Record<Variant, string> = {
  primary: theme.colors.primary,
  success: theme.colors.success,
  danger: theme.colors.hp,
  ghost: theme.colors.transparent,
  outline: theme.colors.transparent,
};

const FG: Record<Variant, string> = {
  primary: theme.colors.textInverse,
  success: theme.colors.textInverse,
  danger: theme.colors.textInverse,
  ghost: theme.colors.text,
  outline: theme.colors.text,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: BG[variant] },
        variant === 'outline' ? styles.outline : null,
        fullWidth ? styles.fullWidth : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text variant="title" color={FG[variant]} style={styles.label}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { minHeight: 50, paddingHorizontal: theme.spacing.lg },
  sm: { minHeight: 40, paddingHorizontal: theme.spacing.md },
  outline: { borderWidth: 1, borderColor: theme.colors.border },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  label: { fontSize: theme.fontSizes.md },
});
