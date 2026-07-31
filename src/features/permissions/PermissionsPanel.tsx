import * as Linking from 'expo-linking';
import { Bell, Camera, Heart, Hourglass, Image as ImageIcon, Mic, Settings } from 'lucide-react-native';
import { createElement, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
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
          <PermissionRow key={status.key} status={status} onChanged={() => void refresh()} />
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
});
