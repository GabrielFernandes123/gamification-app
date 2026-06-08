import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { theme } from '@/theme/theme';

type Props = {
  /** 0..1 */
  progress: number;
  color: string;
  trackColor?: string;
  height?: number;
  rounded?: boolean;
};

export function ProgressBar({
  progress,
  color,
  trackColor = theme.colors.surfaceAlt,
  height = theme.sizes.barHeight,
  rounded = true,
}: Props) {
  const clamped = Math.max(0, Math.min(1, isFinite(progress) ? progress : 0));
  const value = useSharedValue(clamped);

  useEffect(() => {
    value.value = withTiming(clamped, { duration: 280 });
  }, [clamped, value]);

  const fill = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor, height, borderRadius: rounded ? height / 2 : 0 },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          fill,
          { backgroundColor: color, borderRadius: rounded ? height / 2 : 0 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
