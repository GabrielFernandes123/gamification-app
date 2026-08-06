import * as Linking from 'expo-linking';
import { Bell, Camera, Heart, Hourglass, Image as ImageIcon, Mic, Settings } from 'lucide-react-native';
import { createElement, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useSleepSyncOutcome } from '@/features/health/useHealthSync';
import { theme } from '@/theme/theme';

import {
  REQUESTERS,
  usePermissionStatuses,
  type PermissionKey,
  type PermissionState,
  type PermissionStatus,
} from './usePermissionStatuses';

const ICONS: Record<PermissionKey, typeof Bell> = {
  notifications: Bell,
  health: Heart,
  microphone: Mic,
  camera: Camera,
  photos: ImageIcon,
  screentime: Hourglass,
};

const STATE_META: Record<PermissionState, { label: string; color: string }> = {
  granted: { label: 'Concedida', color: theme.colors.success },
  denied: { label: 'Negada', color: theme.colors.hp },
  undetermined: { label: 'Não perguntada', color: theme.colors.gold },
  unknown: { label: 'Definida no app Saúde', color: theme.colors.skill },
  unavailable: { label: 'Indisponível neste build', color: theme.colors.textSubtle },
};

/**
 * A única configuração que sobrou no celular (doc 08 §0).
 *
 * Duas ações por linha, e cada uma existe por um motivo diferente: **Permitir**
 * só aparece enquanto o iOS ainda pergunta; depois de negada ele não pergunta
 * mais, e aí o único caminho real são os **Ajustes**.
 */
export function PermissionsPanel() {
  const { statuses, refresh } = usePermissionStatuses();

  return (
    <Card style={styles.card}>
      <View>
        <Text variant="title">Permissões</Text>
        <Text variant="bodyMuted">
          O que o app precisa do iPhone. Negar não quebra nada — só desliga a ação
          correspondente.
        </Text>
      </View>

      {statuses === null ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        statuses.map((status) => (
          <View key={status.key}>
            <PermissionRow status={status} onChanged={() => void refresh()} />
            {/* Conceder Saúde não é o fim da história: a importação ainda pode
                não achar noite nenhuma. Sem este resumo, o único sintoma de
                falha é o histórico vazio — que foi como o bug do `limit`
                passou despercebido. */}
            {status.key === 'health' && status.state !== 'unavailable' ? (
              <SleepSyncStatus />
            ) : null}
          </View>
        ))
      )}

      <Button
        label="Abrir Ajustes do iPhone"
        variant="outline"
        icon={<Settings color={theme.colors.text} size={16} />}
        onPress={() => void Linking.openSettings()}
        fullWidth
      />
    </Card>
  );
}

/** Cor por gravidade: falha e permissão negada gritam; "já registrado" não. */
const SYNC_COLOR: Record<string, string> = {
  ok: theme.colors.success,
  empty: theme.colors.gold,
  denied: theme.colors.hp,
  error: theme.colors.hp,
  unavailable: theme.colors.textSubtle,
};

function SleepSyncStatus() {
  const { outcome, sync } = useSleepSyncOutcome();
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      await sync();
    } finally {
      setRunning(false);
    }
  }

  return (
    <View style={styles.sync}>
      <Text
        variant="bodyMuted"
        color={outcome ? SYNC_COLOR[outcome.state] : undefined}
        style={styles.syncText}
      >
        {outcome?.message ?? 'Sono ainda não sincronizado nesta sessão.'}
      </Text>
      <Button
        label="Sincronizar sono"
        size="sm"
        variant="outline"
        loading={running}
        onPress={() => void run()}
      />
    </View>
  );
}

function PermissionRow({
  status,
  onChanged,
}: {
  status: PermissionStatus;
  onChanged: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const meta = STATE_META[status.state];
  const requester = REQUESTERS[status.key];
  const canAsk = status.state === 'undetermined' && requester !== undefined;

  async function ask() {
    if (!requester) return;
    setAsking(true);
    try {
      await requester();
    } catch {
      // Negar cai aqui; o estado relido logo abaixo já conta a história.
    } finally {
      setAsking(false);
      onChanged();
    }
  }

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { borderColor: meta.color }]}>
        {createElement(ICONS[status.key], { color: meta.color, size: 18 })}
      </View>
      <View style={styles.copy}>
        <Text variant="title" numberOfLines={1}>
          {status.label}
        </Text>
        <Text variant="bodyMuted">{status.detail}</Text>
        <Text variant="label" color={meta.color}>
          {meta.label}
        </Text>
      </View>
      {canAsk ? (
        <Button label="Permitir" size="sm" loading={asking} onPress={() => void ask()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingLeft: 40 + theme.spacing.md,
  },
  syncText: { flex: 1, minWidth: 0 },
});
