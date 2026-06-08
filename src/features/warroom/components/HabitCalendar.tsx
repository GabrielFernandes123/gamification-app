import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import { type DayAgg, dayStatus, monthRange } from '../month';

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type Props = {
  month: string;
  byDay: Record<string, DayAgg>;
  today: string;
  onSelectDay: (date: string) => void;
};

export function HabitCalendar({ month, byDay, today, onSelectDay }: Props) {
  const { daysInMonth, firstWeekday, dayStr } = monthRange(month);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card>
      <View style={styles.weekRow}>
        {WEEK.map((w, i) => (
          <View key={i} style={styles.cell}>
            <Text variant="label">{w}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`b${i}`} style={styles.cell} />;
          const date = dayStr(day);
          const status = dayStatus(byDay[date]);
          const isToday = date === today;
          const dotColor =
            status === 'good'
              ? theme.colors.success
              : status === 'bad'
                ? theme.colors.hp
                : 'transparent';
          return (
            <Pressable
              key={date}
              style={styles.cell}
              onPress={() => onSelectDay(date)}
              accessibilityLabel={`Dia ${day}`}
            >
              <View style={[styles.dayInner, isToday && styles.todayInner]}>
                <Text variant="body" color={isToday ? theme.colors.primary : theme.colors.text}>
                  {day}
                </Text>
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayInner: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4, width: 36, borderRadius: theme.radius.sm },
  todayInner: { borderWidth: 1, borderColor: theme.colors.primary },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
