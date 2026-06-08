import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';
import { Card } from './Card';
import { Text } from './Text';

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Selecionar data',
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 10,
}: Props) {
  const [open, setOpen] = useState(false);
  const initial = parseDate(value);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selected, setSelected] = useState<{ year: number; month: number; day: number } | null>(
    value ? initial : null,
  );
  const today = getTodayParts();

  const cells = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  function openPicker() {
    const next = parseDate(value);
    setViewYear(next.year);
    setViewMonth(next.month);
    setSelected(value ? next : null);
    setOpen(true);
  }

  function goToMonth(delta: number) {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    if (year < minYear || year > maxYear) return;
    setViewYear(year);
    setViewMonth(month);
  }

  function commit() {
    if (!selected) {
      onChange('');
      setOpen(false);
      return;
    }
    onChange(`${selected.year}-${String(selected.month).padStart(2, '0')}-${String(selected.day).padStart(2, '0')}`);
    setOpen(false);
  }

  const canGoPrev = viewYear > minYear || viewMonth > 1;
  const canGoNext = viewYear < maxYear || viewMonth < 12;

  return (
    <View style={styles.field}>
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable style={styles.button} onPress={openPicker} accessibilityRole="button">
        <CalendarDays color={theme.colors.textMuted} size={18} />
        <View style={styles.flex}>
          <Text variant="bodyMedium">{value ? formatDate(value) : placeholder}</Text>
        </View>
        <ChevronRight color={theme.colors.textMuted} size={18} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.header}>
              <Text variant="h2">{label ?? 'Selecionar data'}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Fechar">
                <X color={theme.colors.textMuted} size={22} />
              </Pressable>
            </View>

            <View style={styles.monthBar}>
              <Pressable
                style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
                onPress={() => goToMonth(-1)}
                disabled={!canGoPrev}
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
              >
                <ChevronLeft color={canGoPrev ? theme.colors.text : theme.colors.textMuted} size={20} />
              </Pressable>
              <Text variant="title">{MONTHS[viewMonth - 1]} {viewYear}</Text>
              <Pressable
                style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
                onPress={() => goToMonth(1)}
                disabled={!canGoNext}
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
              >
                <ChevronRight color={canGoNext ? theme.colors.text : theme.colors.textMuted} size={20} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((weekday, index) => (
                <View key={`${weekday}-${index}`} style={styles.weekCell}>
                  <Text variant="label" color={theme.colors.textMuted}>{weekday}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, index) => {
                if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const isSelected = selected?.year === viewYear && selected?.month === viewMonth && selected?.day === day;
                const isToday = today.year === viewYear && today.month === viewMonth && today.day === day;
                return (
                  <Pressable
                    key={`day-${day}`}
                    style={styles.dayCell}
                    onPress={() => setSelected({ year: viewYear, month: viewMonth, day })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${day}${isToday ? ', hoje' : ''}`}
                  >
                    <View style={[styles.dayInner, isToday && styles.dayInnerToday, isSelected && styles.dayInnerSelected]}>
                      <Text
                        variant={isSelected ? 'title' : 'bodyMedium'}
                        color={isSelected ? theme.colors.textInverse : isToday ? theme.colors.primary : undefined}
                      >
                        {day}
                      </Text>
                      {isToday ? <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.secondaryBtn} onPress={() => {
                setSelected(null);
                onChange('');
                setOpen(false);
              }}>
                <Text variant="title">Limpar</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={commit}>
                <Text variant="title" color={theme.colors.textInverse}>Confirmar</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function buildCalendar(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function parseDate(value: string) {
  const now = new Date();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDateParts(year, month, day)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }

  return { year, month, day };
}

function getTodayParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function isValidDateParts(year: number, month: number, day: number) {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.xs },
  button: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  flex: { flex: 1, minWidth: 0 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
    padding: theme.spacing.lg,
  },
  modalCard: { gap: theme.spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  navBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.4 },
  weekRow: { flexDirection: 'row' },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayInner: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayInnerToday: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dayInnerSelected: {
    backgroundColor: theme.colors.primary,
  },
  todayDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  todayDotSelected: {
    backgroundColor: theme.colors.textInverse,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
