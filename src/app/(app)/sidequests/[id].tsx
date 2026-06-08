import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SideQuestForm } from '@/features/sidequests/components/SideQuestForm';
import { useSideQuests } from '@/features/sidequests/hooks/useSideQuests';
import { theme } from '@/theme/theme';

export default function EditSideQuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quests = useSideQuests();
  const quest = quests.data?.find((q) => q.id === id);

  if (quests.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (!quest) {
    return (
      <Screen>
        <Text variant="title">Missão não encontrada</Text>
      </Screen>
    );
  }
  return <SideQuestForm quest={quest} />;
}
