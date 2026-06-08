import { useRouter } from 'expo-router';
import { Hexagon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import { levelProgress } from '@/utils/leveling';
import type { Skill } from '../hooks/useSkills';

export function SkillRow({ skill }: { skill: Skill }) {
  const router = useRouter();
  const color = skill.color ?? theme.colors.skill;
  const level = skill.level ?? 1;
  const xp = levelProgress(skill.xp, level);

  return (
    <Pressable onPress={() => router.push({ pathname: '/(app)/skills/[id]', params: { id: skill.id } })}>
      <Card accent={color}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Hexagon color={color} size={28} />
          </View>
          <View style={styles.info}>
            <Text variant="title" numberOfLines={1}>
              {skill.name}
            </Text>
            <Text variant="bodyMuted">Nível {level}</Text>
          </View>
          <Text variant="stat" color={color}>
            {skill.xp}
          </Text>
        </View>
        <View style={styles.bar}>
          <ProgressBar progress={xp.ratio} color={color} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  iconWrap: { width: 40, alignItems: 'center' },
  info: { flex: 1, gap: 2 },
  bar: { marginTop: theme.spacing.md },
});
