import { Image as ExpoImage } from 'expo-image';
import { Dumbbell } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
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
};

export function MediaThumb({ uri, size = 44, radius = theme.radius.md, tint = theme.colors.primary, fallback, style }: Props) {
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius }, style]}>
      {uri ? (
        <ExpoImage source={{ uri }} style={styles.image} contentFit="cover" />
      ) : (
        fallback ?? <Dumbbell color={tint} size={Math.round(size * 0.45)} />
      )}
    </View>
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
});
