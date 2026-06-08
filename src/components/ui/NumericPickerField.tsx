import { ChevronRight, Minus, Plus, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { theme } from '@/theme/theme';
import { Card } from './Card';
import { Text } from './Text';

type Props = {
  label?: string;
  title?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  placeholder?: string;
};

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const WHEEL_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

export function NumericPickerField({
  label,
  title,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  placeholder = 'Selecionar',
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? min);
  const scrollRef = useRef<ScrollView>(null);
  const lastIndexRef = useRef(-1);
  const options = useMemo(() => {
    const total = Math.max(0, Math.round((max - min) / step));
    return Array.from({ length: total + 1 }, (_, index) => normalizeValue(min + index * step, step));
  }, [max, min, step]);

  function indexForValue(target: number) {
    return clampNumber(Math.round((target - min) / step), 0, options.length - 1);
  }

  function scrollToIndex(index: number, animated: boolean) {
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
  }

  function openPicker() {
    const initial = value ?? min;
    setDraft(normalizeValue(initial, step));
    lastIndexRef.current = indexForValue(initial);
    setOpen(true);
  }

  function syncFromOffset(offsetY: number) {
    const index = clampNumber(Math.round(offsetY / ITEM_HEIGHT), 0, options.length - 1);
    if (index === lastIndexRef.current) return;
    lastIndexRef.current = index;
    setDraft(options[index]);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    syncFromOffset(event.nativeEvent.contentOffset.y);
  }

  function changeBy(delta: number) {
    const next = clampNumber(indexForValue(draft) + Math.sign(delta), 0, options.length - 1);
    lastIndexRef.current = next;
    setDraft(options[next]);
    scrollToIndex(next, true);
  }

  function commit() {
    onChange(normalizeValue(draft, step));
    setOpen(false);
  }

  const displayValue = value === null ? placeholder : `${formatNumber(value)}${unit ? ` ${unit}` : ''}`;

  return (
    <View style={styles.field}>
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable style={styles.button} onPress={openPicker} accessibilityRole="button">
        <View style={styles.valueWrap}>
          <Text variant="bodyMedium">{displayValue}</Text>
        </View>
        <ChevronRight color={theme.colors.textMuted} size={18} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.header}>
              <Text variant="h2">{title ?? label ?? 'Selecionar valor'}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Fechar">
                <X color={theme.colors.textMuted} size={22} />
              </Pressable>
            </View>

            <View style={styles.pickerShell}>
              <Pressable style={styles.stepBtn} onPress={() => changeBy(-step)} accessibilityRole="button" accessibilityLabel="Diminuir">
                <Minus color={theme.colors.text} size={20} />
              </Pressable>
              <View style={styles.wheel}>
                <ScrollView
                  ref={scrollRef}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.optionList}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  scrollEventThrottle={16}
                  onScroll={handleScroll}
                  onMomentumScrollEnd={handleScroll}
                  onScrollEndDrag={handleScroll}
                  onLayout={() => scrollToIndex(indexForValue(draft), false)}
                >
                  {options.map((option) => {
                    const selected = option === draft;
                    return (
                      <Pressable
                        key={option}
                        style={styles.optionRow}
                        onPress={() => {
                          const index = indexForValue(option);
                          lastIndexRef.current = index;
                          setDraft(option);
                          scrollToIndex(index, true);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text variant={selected ? 'h2' : 'bodyMuted'} color={selected ? theme.colors.text : undefined}>
                          {formatNumber(option)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.centerRail} pointerEvents="none">
                  {unit ? <Text variant="bodyMuted" style={styles.railUnit}>{unit}</Text> : null}
                </View>
              </View>
              <Pressable style={styles.stepBtn} onPress={() => changeBy(step)} accessibilityRole="button" accessibilityLabel="Aumentar">
                <Plus color={theme.colors.text} size={20} />
              </Pressable>
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.secondaryBtn} onPress={() => {
                onChange(null);
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeValue(value: number, step: number) {
  const decimals = step.toString().split('.')[1]?.length ?? 0;
  return Number(value.toFixed(decimals));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
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
  valueWrap: { flex: 1 },
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
  pickerShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stepBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheel: {
    flex: 1,
    height: WHEEL_HEIGHT,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  optionList: {
    paddingVertical: WHEEL_PADDING,
  },
  optionRow: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_PADDING,
    height: ITEM_HEIGHT,
    borderRadius: theme.radius.sm,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.md,
  },
  railUnit: {},
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
