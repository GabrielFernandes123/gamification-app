import { CalendarCheck, Flame, ListChecks, Percent } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';

type Props = {
  daysWithCheckin: number;
  totalCheckins: number;
  checkinRate: number;
  currentStreak: number;
};

export function MonthlyStatsCards({
  daysWithCheckin,
  totalCheckins,
  checkinRate,
  currentStreak,
}: Props) {
  return (
    <View style={styles.grid}>
      <StatCard
        icon={<CalendarCheck color={theme.colors.success} size={20} />}
        value={daysWithCheckin}
        label="Dias com check-in"
      />
      <StatCard
        icon={<ListChecks color={theme.colors.skill} size={20} />}
        value={totalCheckins}
        label="Total de check-ins"
      />
      <StatCard
        icon={<Percent color={theme.colors.xp} size={20} />}
        value={`${checkinRate}%`}
        label="Taxa do mês"
      />
      <StatCard
        icon={<Flame color={theme.colors.primary} size={20} />}
        value={currentStreak}
        label="Sequência atual"
      />
    </View>
  );
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <Card style={styles.card}>
      {icon}
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  card: { flexBasis: '47%', flexGrow: 1, gap: theme.spacing.xs, alignItems: 'flex-start' },
});
