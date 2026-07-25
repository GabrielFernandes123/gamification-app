import { useRouter } from 'expo-router';
import {
  AppWindow,
  ChevronLeft,
  Coins,
  Globe,
  Laptop,
  Pencil,
  Plus,
  Puzzle,
  RefreshCw,
  Smartphone,
  Timer,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { NumericPickerField } from '@/components/ui/NumericPickerField';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  formatDuration,
  useCreateSource,
  useDeleteSource,
  useGeneratePairCode,
  useRevokeDevice,
  useTrackedDevices,
  useTrackingSources,
  useTrackingSummary,
  useUpdateSource,
  type TrackedSource,
} from '@/features/tracking/hooks/useTracking';
import { useToday } from '@/hooks/useToday';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';

type Panel = 'today' | 'sources' | 'devices';

export default function TrackingScreen() {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('today');

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Voltar"
          style={styles.backBtn}
        >
          <ChevronLeft color={theme.colors.text} size={24} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text variant="h1">Tempo de tela</Text>
          <Text variant="bodyMuted">Uso acima da franquia vira custo em ouro.</Text>
        </View>
      </View>

      <Segmented
        value={panel}
        onChange={setPanel}
        options={[
          { value: 'today', label: 'Hoje' },
          { value: 'sources', label: 'Fontes' },
          { value: 'devices', label: 'Dispositivos' },
        ]}
      />

      {panel === 'today' ? <TodayPanel /> : null}
      {panel === 'sources' ? <SourcesPanel /> : null}
      {panel === 'devices' ? <DevicesPanel /> : null}
    </Screen>
  );
}

function SourceIcon({ kind, color }: { kind: 'domain' | 'app'; color: string }) {
  return kind === 'domain' ? <Globe color={color} size={16} /> : <AppWindow color={color} size={16} />;
}

function TodayPanel() {
  const { today } = useToday();
  const summary = useTrackingSummary(today);
  const data = summary.data;

  if (!data || data.sources.length === 0) {
    return (
      <Card>
        <Text variant="bodyMuted">
          Nada rastreado hoje. Pareie a extensão, o desktop ou o iPhone em Dispositivos — o tempo
          aparece aqui e o excedente da franquia vira custo em ouro.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.stack}>
      <Card style={styles.heroRow}>
        <View style={styles.heroItem}>
          <Timer color={theme.colors.primary} size={20} />
          <View>
            <Text variant="label">Tempo rastreado</Text>
            <Text variant="stat">{formatDuration(data.totals.seconds)}</Text>
          </View>
        </View>
        <View style={styles.heroItem}>
          <Coins color={theme.colors.gold} size={20} />
          <View>
            <Text variant="label">Custo de hoje</Text>
            <Text variant="stat" color={theme.colors.gold}>
              -{data.totals.gold_charged} ouro
            </Text>
          </View>
        </View>
      </Card>

      {data.sources.map((source) => {
        const free = source.daily_free_seconds ?? 0;
        return (
          <Card key={`${source.kind}:${source.matcher}`} style={styles.sourceCard}>
            <View style={styles.rowLine}>
              <SourceIcon kind={source.kind} color={theme.colors.textMuted} />
              <Text variant="title" style={styles.rowTitle} numberOfLines={1}>
                {source.label}
              </Text>
              {source.is_tracked ? (
                <Text
                  variant="label"
                  color={
                    source.boss_feed_seconds > 0
                      ? theme.colors.hp
                      : source.gold_charged > 0
                        ? theme.colors.gold
                        : theme.colors.success
                  }
                >
                  {source.boss_feed_seconds > 0
                    ? `Boss +${formatDuration(source.boss_feed_seconds)}`
                    : source.gold_charged > 0
                      ? `-${source.gold_charged} ouro`
                      : 'Na franquia'}
                </Text>
              ) : (
                <Text variant="label" color={theme.colors.textMuted}>
                  Só estatística
                </Text>
              )}
            </View>
            <Text variant="bodyMuted">
              {formatDuration(source.seconds)}
              {source.is_tracked && source.gold_per_hour
                ? ` · ${source.gold_per_hour} ouro/h após ${formatDuration(free)} grátis`
                : ''}
            </Text>
            {source.is_tracked && free > 0 ? (
              <>
                <ProgressBar
                  progress={Math.min(1, source.seconds / free)}
                  color={source.gold_charged > 0 ? theme.colors.gold : theme.colors.success}
                />
                <Text variant="bodyMuted">
                  Franquia: {formatDuration(Math.max(0, source.free_remaining ?? 0))} restante
                </Text>
              </>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

const EMPTY_FORM = {
  kind: 'app' as 'domain' | 'app',
  matcher: '',
  label: '',
  freeMinutes: 60,
  goldPerHour: 60,
  bossMinutes: 0, // zona 3; 0 = nunca alimenta o boss
  active: true,
};

function SourcesPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const sources = useTrackingSources();
  const create = useCreateSource();
  const update = useUpdateSource();
  const remove = useDeleteSource();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrackedSource | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(source: TrackedSource) {
    setEditing(source);
    setForm({
      kind: source.kind,
      matcher: source.matcher,
      label: source.label,
      freeMinutes: Math.round(source.daily_free_seconds / 60),
      goldPerHour: source.gold_per_hour,
      bossMinutes: source.boss_threshold_seconds
        ? Math.round(source.boss_threshold_seconds / 60)
        : 0,
      active: source.is_active,
    });
    setFormOpen(true);
  }

  function onSubmit() {
    const payload = {
      kind: form.kind,
      matcher: form.matcher.trim(),
      label: form.label.trim() || form.matcher.trim(),
      daily_free_seconds: Math.max(0, Math.round(form.freeMinutes)) * 60,
      gold_per_hour: Math.max(0, Math.round(form.goldPerHour)),
      boss_threshold_seconds: Math.max(0, Math.round(form.bossMinutes)) * 60,
      is_active: form.active,
    };
    if (!payload.matcher) {
      toast.error('Matcher obrigatório', 'Informe o site ou o nome do app.');
      return;
    }
    const opts = {
      onSuccess: () => {
        setFormOpen(false);
        toast.success(editing ? 'Fonte atualizada' : 'Fonte criada');
      },
      onError: (e: unknown) => toast.error('Erro ao salvar fonte', formatErrorMessage(e)),
    };
    if (editing) update.mutate({ id: editing.id, ...payload }, opts);
    else create.mutate(payload, opts);
  }

  async function onDelete(source: TrackedSource) {
    const ok = await confirm({
      title: 'Excluir fonte',
      message: `Remover "${source.label}"? O histórico já cobrado não muda.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(source.id, {
      onSuccess: () => toast.success('Fonte removida'),
      onError: (e) => toast.error('Erro ao remover', formatErrorMessage(e)),
    });
  }

  return (
    <View style={styles.stack}>
      <Button
        label="Nova fonte"
        icon={<Plus color={theme.colors.textInverse} size={16} />}
        onPress={openCreate}
        fullWidth
      />

      {(sources.data ?? []).length === 0 ? (
        <Card>
          <Text variant="bodyMuted">
            Uma fonte define o que é cobrado: o site (youtube.com), o app do PC (steam.exe) ou o app
            do iPhone (youtube), a franquia diária grátis e o preço em ouro por hora do excedente.
          </Text>
        </Card>
      ) : (
        (sources.data ?? []).map((source) => (
          <Card key={source.id} style={styles.sourceCard}>
            <View style={styles.rowLine}>
              <SourceIcon kind={source.kind} color={theme.colors.textMuted} />
              <View style={styles.rowTitle}>
                <Text variant="title" numberOfLines={1}>
                  {source.label}
                  {source.is_active ? '' : '  · pausada'}
                </Text>
                <Text variant="bodyMuted" numberOfLines={1}>
                  {source.matcher} · {formatDuration(source.daily_free_seconds)} grátis ·{' '}
                  {source.gold_per_hour} ouro/h
                </Text>
              </View>
              <Pressable onPress={() => openEdit(source)} hitSlop={8} accessibilityLabel="Editar">
                <Pencil color={theme.colors.textMuted} size={18} />
              </Pressable>
              <Pressable onPress={() => void onDelete(source)} hitSlop={8} accessibilityLabel="Excluir">
                <Trash2 color={theme.colors.hp} size={18} />
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text variant="h2">{editing ? 'Editar fonte' : 'Nova fonte'}</Text>
            <Text variant="bodyMuted">
              O tempo acima da franquia diária é cobrado em ouro pela taxa por hora.
            </Text>

            <View style={styles.field}>
              <Text variant="label">Tipo</Text>
              <Segmented
                value={form.kind}
                onChange={(kind) => (editing ? null : setForm({ ...form, kind }))}
                options={[
                  { value: 'domain', label: 'Site' },
                  { value: 'app', label: 'App (PC/iPhone)' },
                ]}
              />
            </View>

            <Input
              label={form.kind === 'domain' ? 'Domínio (ex.: youtube.com)' : 'App (ex.: steam.exe ou youtube)'}
              value={form.matcher}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(matcher) => setForm({ ...form, matcher })}
            />
            <Input
              label="Nome de exibição"
              value={form.label}
              placeholder={form.matcher || 'YouTube'}
              onChangeText={(label) => setForm({ ...form, label })}
            />
            <NumericPickerField
              label="Franquia grátis"
              title="Minutos grátis por dia"
              value={form.freeMinutes}
              onChange={(v) => setForm({ ...form, freeMinutes: v ?? 0 })}
              min={0}
              max={1440}
              step={5}
              unit="min/dia"
            />
            <NumericPickerField
              label="Custo do excedente"
              title="Ouro por hora"
              value={form.goldPerHour}
              onChange={(v) => setForm({ ...form, goldPerHour: v ?? 0 })}
              min={0}
              max={2000}
              step={10}
              unit="ouro/h"
            />
            <NumericPickerField
              label="Limite antes do boss (0 = desligado)"
              title="Minutos até alimentar o boss"
              value={form.bossMinutes}
              onChange={(v) => setForm({ ...form, bossMinutes: v ?? 0 })}
              min={0}
              max={1440}
              step={15}
              unit="min/dia"
            />
            <View style={styles.field}>
              <Text variant="label">Status</Text>
              <Segmented
                value={form.active ? 'on' : 'off'}
                onChange={(v) => setForm({ ...form, active: v === 'on' })}
                options={[
                  { value: 'on', label: 'Ativa' },
                  { value: 'off', label: 'Pausada' },
                ]}
              />
            </View>

            <Button
              label={editing ? 'Salvar' : 'Criar fonte'}
              onPress={onSubmit}
              loading={create.isPending || update.isPending}
              fullWidth
            />
            <Button label="Cancelar" variant="ghost" onPress={() => setFormOpen(false)} fullWidth />
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function DevicesPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const devices = useTrackedDevices();
  const generate = useGeneratePairCode();
  const revoke = useRevokeDevice();
  const [remaining, setRemaining] = useState(0);

  const code = generate.data;
  const expiresAt = useMemo(() => (code ? new Date(code.expires_at).getTime() : null), [code]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const active = (devices.data ?? []).filter((d) => !d.revoked_at);

  async function onRevoke(id: string, name: string) {
    const ok = await confirm({
      title: 'Revogar dispositivo',
      message: `"${name}" vai parar de enviar dados e precisará parear de novo.`,
      confirmLabel: 'Revogar',
      destructive: true,
    });
    if (!ok) return;
    revoke.mutate(id, {
      onSuccess: () => toast.success('Dispositivo revogado'),
      onError: (e) => toast.error('Erro ao revogar', formatErrorMessage(e)),
    });
  }

  return (
    <View style={styles.stack}>
      <Card style={styles.sourceCard}>
        <Text variant="title">Parear novo dispositivo</Text>
        <Text variant="bodyMuted">
          Gere um código e digite na extensão, no desktop ou no atalho "Evolve Setup" do iPhone.
          Vale por 10 minutos, uso único.
        </Text>
        {code && remaining > 0 ? (
          <View style={styles.codeBox}>
            <Text variant="display" style={styles.codeText}>
              {code.code}
            </Text>
            <Text variant="bodyMuted">
              expira em {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </Text>
          </View>
        ) : null}
        <Button
          label={code && remaining > 0 ? 'Gerar outro código' : 'Gerar código'}
          icon={<RefreshCw color={theme.colors.text} size={16} />}
          variant="outline"
          loading={generate.isPending}
          onPress={() =>
            generate.mutate(undefined, {
              onError: (e) => toast.error('Erro ao gerar código', formatErrorMessage(e)),
            })
          }
        />
      </Card>

      <Card style={styles.sourceCard}>
        <Text variant="title">iPhone (Atalhos)</Text>
        <Text variant="bodyMuted">
          1. Gere o código acima e rode o atalho Evolve Setup.{'\n'}
          2. Cole o token no atalho Evolve Track (uma vez).{'\n'}
          3. Crie 2 automações por app ("aberto"/"fechado") executando o Evolve Track.{'\n'}
          4. Crie a fonte com tipo App e o mesmo matcher (ex.: youtube).
        </Text>
      </Card>

      {active.length === 0 ? (
        <Card>
          <Text variant="bodyMuted">Nenhum dispositivo pareado ainda.</Text>
        </Card>
      ) : (
        active.map((device) => (
          <Card key={device.id} style={styles.sourceCard}>
            <View style={styles.rowLine}>
              {device.platform === 'extension' ? (
                <Puzzle color={theme.colors.textMuted} size={18} />
              ) : device.platform === 'iphone' ? (
                <Smartphone color={theme.colors.textMuted} size={18} />
              ) : (
                <Laptop color={theme.colors.textMuted} size={18} />
              )}
              <View style={styles.rowTitle}>
                <Text variant="title">{device.name}</Text>
                <Text variant="bodyMuted">
                  {device.platform === 'extension'
                    ? 'Extensão'
                    : device.platform === 'iphone'
                      ? 'iPhone (Atalhos)'
                      : 'Desktop'}{' '}
                  · visto:{' '}
                  {device.last_seen_at
                    ? new Date(device.last_seen_at).toLocaleString('pt-BR')
                    : 'nunca'}
                </Text>
              </View>
              <Button
                label="Revogar"
                variant="danger"
                size="sm"
                onPress={() => void onRevoke(device.id, device.name)}
              />
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  backBtn: { minWidth: theme.sizes.touch, minHeight: theme.sizes.touch, justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  stack: { gap: theme.spacing.md },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
  heroItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  sourceCard: { gap: theme.spacing.sm },
  field: { gap: theme.spacing.xs },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  rowTitle: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: { gap: theme.spacing.md },
  codeBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  codeText: { letterSpacing: 8 },
});
