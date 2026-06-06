import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { RewardForm } from '@/features/store/components/RewardForm';
import { useRewards } from '@/features/store/hooks/useStore';
import { theme } from '@/theme/theme';

export default function EditRewardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rewards = useRewards();
  const reward = rewards.data?.find((r) => r.id === id);

  if (rewards.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (!reward) {
    return (
      <Screen>
        <Text variant="title">Recompensa não encontrada</Text>
      </Screen>
    );
  }
  return <RewardForm reward={reward} />;
}
