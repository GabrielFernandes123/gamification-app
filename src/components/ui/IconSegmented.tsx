import type { LucideIcon } from 'lucide-react-native';
import { createElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';
import { Text } from './Text';

export type IconSegOption<T extends string | number> = {
  value: T;
  label: string;
  icon: LucideIcon;
  color?: string;
};

type Props<T extends string | number> = {
  options: IconSegOption<T>[];
  value: T;
  onChange: (v: T) => void;
};

/**
 * Seletor de modo com ícones, no mesmo visual dos "Módulos" da Início
 * (ícone em caixa arredondada + rótulo). Diferente do `ModuleLauncher`, este
 * não navega: alterna o `value` selecionado, destacando o item ativo com a cor
 * própria (borda + fundo tingido), igual ao `Segmented` de texto.
 */
export function IconSegmented<T extends string | number>({ options, value, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.grid}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const tint = o.color ?? theme.colors.primary;
        const fg = selected ? tint : theme.colors.textMuted;
        return (
          <Pressable
            key={String(o.value)}
            style={styles.item}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
          >
            <View
              style={[
                styles.icon,
                { borderColor: selected ? tint : theme.colors.border },
                selected ? { backgroundColor: tint + '22' } : null,
              ]}
            >
              {createElement(o.icon, { color: fg, size: 20 })}
            </View>
            <Text variant="label" numberOfLines={1} color={fg}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, alignSelf: 'stretch' },
  grid: { gap: theme.spacing.md, paddingRight: theme.spacing.sm },
  item: { width: 72, alignItems: 'center', gap: theme.spacing.xs },
  icon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
