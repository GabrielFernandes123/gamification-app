import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SkillForm } from '@/features/skills/components/SkillForm';
import { useSkills } from '@/features/skills/hooks/useSkills';
import { theme } from '@/theme/theme';

export default function EditSkillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const skills = useSkills();
  const skill = skills.data?.find((s) => s.id === id);

  if (skills.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (!skill) {
    return (
      <Screen>
        <Text variant="title">Skill não encontrada</Text>
      </Screen>
    );
  }
  return <SkillForm skill={skill} />;
}
