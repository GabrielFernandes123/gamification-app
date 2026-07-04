import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { theme } from '@/theme/theme';
import { Text } from './Text';

type Props = TextInputProps & { label?: string };

export const Input = forwardRef<TextInput, Props>(function Input({ label, style, ...rest }, ref) {
  return (
    <View style={styles.wrap}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, style]}
        selectionColor={theme.colors.primaryBright}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.xs },
  input: {
    minHeight: theme.sizes.touch,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
  },
});
