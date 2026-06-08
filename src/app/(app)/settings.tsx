import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, LogOut, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumericPickerField } from '@/components/ui/NumericPickerField';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useBodyAlertSettings, useUpsertBodyAlertSettings } from '@/features/body/hooks/useBody';
import { useCharacter, useProfile } from '@/features/character/hooks/useCharacter';
import {
  useInactiveHabits,
  useReactivateHabit,
  useUpdateGoals,
  useUpdateProfile,
} from '@/features/settings/hooks/useSettings';
import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme/theme';
import { todayInTz } from '@/utils/date';
import { formatErrorMessage } from '@/utils/errors';

const TIMEZONES = [
  { value: 'America/Cuiaba', label: 'Cuiabá' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Manaus', label: 'Manaus' },
  { value: 'America/Fortaleza', label: 'Fortaleza' },
  { value: 'America/Rio_Branco', label: 'Rio Branco' },
  { value: 'UTC', label: 'UTC' },
];

const DEATH_MODES = [
  { value: 'seasonal', label: 'Temporada' },
  { value: 'soft', label: 'Leve' },
  { value: 'hardcore', label: 'Hardcore' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const profile = useProfile();
  const character = useCharacter();
  const bodyAlerts = useBodyAlertSettings();
  const updateProfile = useUpdateProfile();
  const updateGoals = useUpdateGoals();
  const updateBodyAlerts = useUpsertBodyAlertSettings();
  const inactive = useInactiveHabits();
  const reactivate = useReactivateHabit();
  const toast = useToast();

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [tzDraft, setTzDraft] = useState<string | null>(null);
  const [xpGoalDraft, setXpGoalDraft] = useState<number | null>(null);
  const [goldGoalDraft, setGoldGoalDraft] = useState<number | null>(null);
  const [deathModeDraft, setDeathModeDraft] = useState<string | null>(null);
  const [workoutDaysDraft, setWorkoutDaysDraft] = useState<number | null>(null);
  const [measurementDaysDraft, setMeasurementDaysDraft] = useState<number | null>(null);
  const [partDaysDraft, setPartDaysDraft] = useState<number | null>(null);

  const name = nameDraft ?? profile.data?.display_name ?? '';
  const tz = tzDraft ?? profile.data?.timezone ?? 'America/Cuiaba';
  const xpGoal = xpGoalDraft ?? character.data?.daily_xp_goal ?? 400;
  const goldGoal = goldGoalDraft ?? character.data?.daily_gold_goal ?? 50;
  const deathMode = deathModeDraft ?? character.data?.death_mode ?? 'seasonal';
  const workoutDays = workoutDaysDraft ?? bodyAlerts.data?.workout_stale_days ?? 5;
  const measurementDays = measurementDaysDraft ?? bodyAlerts.data?.measurement_stale_days ?? 14;
  const partDays = partDaysDraft ?? bodyAlerts.data?.body_part_stale_days ?? 10;

  const saving = updateProfile.isPending || updateGoals.isPending || updateBodyAlerts.isPending;

  async function onSave() {
    try {
      await updateProfile.mutateAsync({ display_name: name.trim() || null, timezone: tz });
      await updateGoals.mutateAsync({ daily_xp_goal: xpGoal, daily_gold_goal: goldGoal, death_mode: deathMode });
      await updateBodyAlerts.mutateAsync({
        workout_stale_days: workoutDays,
        measurement_stale_days: measurementDays,
        body_part_stale_days: partDays,
      });
      toast.success('Configurações salvas', `Hoje no fuso selecionado: ${todayInTz(tz)}.`);
    } catch (e) {
      toast.error('Erro ao salvar', formatErrorMessage(e));
    }
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <ChevronLeft color={theme.colors.text} size={26} />
        </Pressable>
        <Text variant="h1">Configurações</Text>
        <View style={{ width: 26 }} />
      </View>

      <Input label="Nome" value={name} onChangeText={setNameDraft} placeholder="Seu nome" />

      <Field label="Fuso horário">
        <Segmented options={TIMEZONES} value={tz} onChange={setTzDraft} wrap />
        <Text variant="bodyMuted">Data usada nos hábitos: {todayInTz(tz)}</Text>
      </Field>

      <NumericPickerField label="Meta diária de XP" title="Meta diária de XP" value={xpGoal} onChange={(v) => setXpGoalDraft(v ?? 0)} min={0} max={100000} step={50} unit="XP" />
      <NumericPickerField label="Meta diária de ouro" title="Meta diária de ouro" value={goldGoal} onChange={(v) => setGoldGoalDraft(v ?? 0)} min={0} max={100000} step={10} unit="ouro" />

      <Field label="Morte">
        <Segmented options={DEATH_MODES} value={deathMode} onChange={setDeathModeDraft} wrap />
        <Text variant="bodyMuted">
          Temporada reduz ouro e streak; Leve reduz pouco; Hardcore reinicia XP, ouro e progresso volátil.
        </Text>
      </Field>

      <Card style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.alertIcon}>
            <Bell color={theme.colors.textInverse} size={20} />
          </View>
          <View style={styles.flex}>
            <Text variant="title">Avisos do corpo</Text>
            <Text variant="bodyMuted">Depois de quantos dias o resumo deve alertar.</Text>
          </View>
        </View>
        {bodyAlerts.isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            <NumericPickerField label="Sem treinar" value={workoutDays} onChange={(v) => setWorkoutDaysDraft(v ?? 1)} min={1} max={60} unit="dias" />
            <NumericPickerField label="Sem medir" value={measurementDays} onChange={(v) => setMeasurementDaysDraft(v ?? 1)} min={1} max={90} unit="dias" />
            <NumericPickerField label="Divisão sem estímulo" value={partDays} onChange={(v) => setPartDaysDraft(v ?? 1)} min={1} max={60} unit="dias" />
          </>
        )}
      </Card>

      <Button label="Salvar" onPress={onSave} loading={saving} fullWidth />

      <View style={styles.section}>
        <Text variant="h2">Hábitos inativos</Text>
        {(inactive.data ?? []).length === 0 ? (
          <Text variant="bodyMuted">Nenhum hábito inativo.</Text>
        ) : (
          (inactive.data ?? []).map((h) => (
            <Card key={h.id} style={styles.inactiveRow}>
              <Text variant="title" style={styles.inactiveName} numberOfLines={1}>
                {h.name}
              </Text>
              <Button
                label="Reativar"
                size="sm"
                variant="outline"
                icon={<RotateCcw color={theme.colors.text} size={16} />}
                onPress={() =>
                  reactivate.mutate(h.id, {
                    onSuccess: () => toast.success('Hábito reativado', h.name),
                    onError: (e) => toast.error('Erro ao reativar', formatErrorMessage(e)),
                  })
                }
              />
            </Card>
          ))
        )}
      </View>

      <Button
        label="Sair"
        variant="danger"
        icon={<LogOut color={theme.colors.textInverse} size={18} />}
        onPress={signOut}
        fullWidth
        style={styles.signOut}
      />
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  field: { gap: theme.spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  alertCard: { gap: theme.spacing.md },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: theme.spacing.md, marginTop: theme.spacing.md },
  inactiveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  inactiveName: { flex: 1 },
  signOut: { marginTop: theme.spacing.lg },
});
