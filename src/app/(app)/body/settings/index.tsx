import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useBodyAlertSettings, useUpsertBodyAlertSettings } from '@/features/body/hooks/useBody';
import { theme } from '@/theme/theme';
import type { BodyAlertSettings } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';

export default function BodyAlertSettingsScreen() {
  const router = useRouter();
  const settings = useBodyAlertSettings();

  return (
    <Screen scroll contentStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft color={theme.colors.text} size={18} />
        <Text variant="bodyMedium">Corpo</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Bell color={theme.colors.textInverse} size={22} />
        </View>
        <View style={styles.flex}>
          <Text variant="h1">Avisos</Text>
          <Text variant="bodyMuted">Depois de quantos dias o resumo deve te alertar.</Text>
        </View>
      </View>

      {settings.isLoading || !settings.data ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <AlertSettingsForm initial={settings.data} />
      )}
    </Screen>
  );
}

function AlertSettingsForm({ initial }: { initial: BodyAlertSettings }) {
  const toast = useToast();
  const saveSettings = useUpsertBodyAlertSettings();
  const [workoutDays, setWorkoutDays] = useState(String(initial.workout_stale_days ?? 5));
  const [measurementDays, setMeasurementDays] = useState(String(initial.measurement_stale_days ?? 14));
  const [partDays, setPartDays] = useState(String(initial.body_part_stale_days ?? 10));

  async function save() {
    try {
      await saveSettings.mutateAsync({
        workout_stale_days: Math.max(1, Number(workoutDays) || 5),
        measurement_stale_days: Math.max(1, Number(measurementDays) || 14),
        body_part_stale_days: Math.max(1, Number(partDays) || 10),
      });
      toast.success('Avisos atualizados');
    } catch (e) {
      toast.error('Erro ao salvar avisos', formatErrorMessage(e));
    }
  }

  return (
    <Card style={styles.panel}>
      <Field label="Sem treinar" hint="Alerta quando você passa esse tanto de dias sem registrar treino.">
        <Input value={workoutDays} onChangeText={setWorkoutDays} keyboardType="number-pad" />
      </Field>
      <Field label="Sem medir" hint="Alerta quando você passa esse tanto de dias sem registrar medidas.">
        <Input value={measurementDays} onChangeText={setMeasurementDays} keyboardType="number-pad" />
      </Field>
      <Field label="Divisão sem estímulo" hint="Alerta quando um grupo muscular fica esse tanto de dias sem ser treinado.">
        <Input value={partDays} onChangeText={setPartDays} keyboardType="number-pad" />
      </Field>
      <Pressable style={[styles.primaryBtn, saveSettings.isPending && styles.btnDisabled]} onPress={save} disabled={saveSettings.isPending}>
        {saveSettings.isPending ? (
          <ActivityIndicator color={theme.colors.textInverse} />
        ) : (
          <Text variant="title" color={theme.colors.textInverse}>Salvar avisos</Text>
        )}
      </Pressable>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      {children}
      <Text variant="bodyMuted">{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  flex: { flex: 1, minWidth: 0 },
  backButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: { gap: theme.spacing.lg },
  field: { gap: theme.spacing.sm },
  primaryBtn: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  btnDisabled: { opacity: 0.6 },
});
