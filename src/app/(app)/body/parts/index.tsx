import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { PartsManager } from '@/features/body/components/PartsManager';
import { theme } from '@/theme/theme';

export default function BodyPartsScreen() {
  const router = useRouter();
  return (
    <Screen scroll contentStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft color={theme.colors.text} size={18} />
        <Text variant="bodyMedium">Corpo</Text>
      </Pressable>
      <PartsManager />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  backButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
  },
});
