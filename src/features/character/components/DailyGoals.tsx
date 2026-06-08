import { Coins, Zap } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTodayLogs } from '@/features/habits/hooks/useTodayLogs';
import { useToday } from '@/hooks/useToday';
import { theme } from '@/theme/theme';
import { useCharacter } from '../hooks/useCharacter';

export function DailyGoals() {
  const { today } = useToday();
  const character = useCharacter();
  const logs = useTodayLogs(today);

  const xpToday = (logs.data ?? []).reduce((s, l) => s + l.xp_gained, 0);
  const goldToday = (logs.data ?? []).reduce((s, l) => s + l.gold_gained, 0);
  const xpGoal = character.data?.daily_xp_goal ?? 0;
  const goldGoal = character.data?.daily_gold_goal ?? 0;

  return (
    <Card>
      <Text variant="label">Meta do dia</Text>

      <View style={styles.block}>
        <View style={styles.row}>
          <View style={styles.label}>
            <Zap color={theme.colors.xp} size={14} />
            <Text variant="bodyMuted">XP</Text>
          </View>
          <Text variant="bodyMuted">
            {xpToday}/{xpGoal}
          </Text>
        </View>
        <ProgressBar progress={xpGoal > 0 ? xpToday / xpGoal : 0} color={theme.colors.xp} />
      </View>

      <View style={styles.block}>
        <View style={styles.row}>
          <View style={styles.label}>
            <Coins color={theme.colors.gold} size={14} />
            <Text variant="bodyMuted">Ouro</Text>
          </View>
          <Text variant="bodyMuted">
            {goldToday}/{goldGoal}
          </Text>
        </View>
        <ProgressBar progress={goldGoal > 0 ? goldToday / goldGoal : 0} color={theme.colors.gold} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: theme.spacing.md, gap: theme.spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
});
