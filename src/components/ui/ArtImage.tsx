import { Image as ExpoImage } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

type Props = {
  /** URL da arte gerada por IA. null = ainda não gerada (ou IA desligada). */
  uri?: string | null;
  /** Proporção reservada: 16/9 banner, 3/4 retrato, 1 emblema. */
  ratio?: number;
  radius?: number;
  /** Cor da borda/ícone quando não há arte (tier do boss, raridade...). */
  tint?: string;
  /** Conteúdo mostrado no lugar da imagem enquanto ela não existe. */
  fallback?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Arte gerada por IA com estado vazio embutido.
 *
 * A imagem é SEMPRE opcional: enquanto o cron de arte não passou, o espaço fica
 * reservado pela mesma proporção (sem salto de layout) e o fallback aparece.
 * Irmão do `MediaThumb`, que é quadrado e serve para mídia enviada pelo usuário.
 */
export function ArtImage({
  uri,
  ratio = 1,
  radius = theme.radius.md,
  tint = theme.colors.primary,
  fallback,
  style,
}: Props) {
  return (
    <View
      style={[
        styles.box,
        { aspectRatio: ratio, borderRadius: radius, borderColor: tint },
        style,
      ]}
    >
      {uri ? (
        <ExpoImage
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          transition={220}
          cachePolicy="disk"
        />
      ) : (
        fallback
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});
