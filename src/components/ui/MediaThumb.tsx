import { Image as ExpoImage } from 'expo-image';
import { Dumbbell, Maximize2 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

type Props = {
  uri?: string | null;
  size?: number;
  radius?: number;
  /** Cor do ícone de fallback. */
  tint?: string;
  /** Ícone de fallback custom (default: halter). */
  fallback?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Abre a mídia em tela cheia. Só vira botão quando HÁ mídia — sem uri o
   * toque não teria o que mostrar e roubaria o toque da linha inteira.
   */
  onPress?: () => void;
};

export function MediaThumb({ uri, size = 44, radius = theme.radius.md, tint = theme.colors.primary, fallback, style, onPress }: Props) {
  const box = [styles.box, { width: size, height: size, borderRadius: radius }, style];
  const content = uri ? (
    <ExpoImage source={{ uri }} style={styles.image} contentFit="cover" />
  ) : (
    fallback ?? <Dumbbell color={tint} size={Math.round(size * 0.45)} />
  );

  if (!onPress || !uri) return <View style={box}>{content}</View>;

  return (
    <Pressable
      style={box}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Ver a demonstração do exercício"
    >
      {content}
      {/* selo discreto: sem ele não há como saber que o thumb abre */}
      <View style={styles.badge}>
        <Maximize2 color={theme.colors.textInverse} size={Math.max(9, Math.round(size * 0.2))} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    padding: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
