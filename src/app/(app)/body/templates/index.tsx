import { useRouter } from 'expo-router';
import { Archive, ChevronLeft, Play, RotateCcw, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  useAllWorkoutTemplates,
  useCreateWorkoutSession,
  useDeleteWorkoutTemplate,
  useUpdateWorkoutTemplate,
} from '@/features/body/hooks/useBody';
import { theme } from '@/theme/theme';
import type { WorkoutTemplate } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';

export default function TemplatesScreen() {
  const router = useRouter();
  const toast = useToast();
  const templates = useAllWorkoutTemplates();
  const createSession = useCreateWorkoutSession();
  const updateTemplate = useUpdateWorkoutTemplate();
  const deleteTemplate = useDeleteWorkoutTemplate();

  const all = templates.data ?? [];
  const active = all.filter((t) => t.is_active);
  const archived = all.filter((t) => !t.is_active);

  async function startTemplate(template: WorkoutTemplate) {
    try {
      const session = await createSession.mutateAsync({
        name: template.name,
        template_id: template.id,
        media_url: template.media_url,
      });
      toast.success('Treino iniciado', template.name);
      router.navigate({ pathname: '/(app)/body/workouts/[id]', params: { id: session.id } });
    } catch (e) {
      toast.error('Erro ao iniciar treino', formatErrorMessage(e));
    }
  }

  function confirmArchive(template: WorkoutTemplate) {
    Alert.alert('Arquivar treino', `Arquivar "${template.name}"? Ele sai da lista, mas fica guardado aqui.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Arquivar',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateTemplate.mutateAsync({ id: template.id, patch: { is_active: false } });
            toast.info('Treino arquivado', template.name);
          } catch (e) {
            toast.error('Erro ao arquivar treino', formatErrorMessage(e));
          }
        },
      },
    ]);
  }

  async function restore(template: WorkoutTemplate) {
    try {
      await updateTemplate.mutateAsync({ id: template.id, patch: { is_active: true } });
      toast.success('Treino restaurado', template.name);
    } catch (e) {
      toast.error('Erro ao restaurar treino', formatErrorMessage(e));
    }
  }

  function confirmDelete(template: WorkoutTemplate) {
    Alert.alert('Excluir treino', `Excluir "${template.name}" de vez? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTemplate.mutateAsync(template.id);
            toast.info('Treino excluído', template.name);
          } catch (e) {
            toast.error('Erro ao excluir treino', formatErrorMessage(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft color={theme.colors.text} size={18} />
        <Text variant="bodyMedium">Treinos</Text>
      </Pressable>

      <View>
        <Text variant="h1">Treinos</Text>
        <Text variant="bodyMuted">Todos os treinos, incluindo os arquivados.</Text>
      </View>

      <Card style={styles.panel}>
        <Text variant="title">Ativos</Text>
        {active.length === 0 ? (
          <Text variant="bodyMuted">Nenhum treino ativo.</Text>
        ) : (
          active.map((template) => (
            <View key={template.id} style={styles.templateRow}>
              <View style={styles.flex}>
                <Text variant="bodyMedium">{template.name}</Text>
                <Text variant="bodyMuted">{template.exercises?.length ?? 0} exercícios</Text>
              </View>
              <Pressable style={styles.iconBtn} onPress={() => startTemplate(template)} accessibilityLabel="Iniciar">
                <Play color={theme.colors.primary} size={18} />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => confirmArchive(template)} accessibilityLabel="Arquivar">
                <Archive color={theme.colors.textMuted} size={18} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.panel}>
        <Text variant="title">Arquivados</Text>
        {archived.length === 0 ? (
          <Text variant="bodyMuted">Nenhum treino arquivado.</Text>
        ) : (
          archived.map((template) => (
            <View key={template.id} style={styles.templateRow}>
              <View style={styles.flex}>
                <Text variant="bodyMedium">{template.name}</Text>
                <Text variant="bodyMuted">{template.exercises?.length ?? 0} exercícios · arquivado</Text>
              </View>
              <Pressable style={styles.iconBtn} onPress={() => restore(template)} accessibilityLabel="Restaurar">
                <RotateCcw color={theme.colors.success} size={18} />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => confirmDelete(template)} accessibilityLabel="Excluir">
                <Trash2 color={theme.colors.hp} size={18} />
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  panel: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  backButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
  },
  templateRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
