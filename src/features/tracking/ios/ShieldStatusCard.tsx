import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import { useShieldSync } from './useShieldSync';

/**
 * Estado do bloqueio nativo, e o botão que força um sync.
 *
 * O sync roda sozinho ao abrir o app e ao voltar para o primeiro plano; este
 * card existe para dar visibilidade (e para depurar) — principalmente do caso
 * "fonte com limite mas sem app vinculado", que é silencioso por natureza.
 */
export function ShieldStatusCard() {
  const { result, syncing, sync } = useShieldSync();
  const [authorizing, setAuthorizing] = useState(false);

  if (Platform.OS !== 'ios' || !DeviceActivity.isAvailable()) return null;

  const ok = result?.ok === true;
  const message = describe(result);
  // reinstalar o app revoga a autorização no iOS, então este caminho é comum
  const needsAuth = result?.ok === false && result.reason === 'unauthorized';

  async function authorize() {
    setAuthorizing(true);
    try {
      await DeviceActivity.requestAuthorization('individual');
      await sync();
    } catch {
      // negar cai aqui; o card continua mostrando o estado
    } finally {
      setAuthorizing(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {ok ? (
          <ShieldCheck color={theme.colors.success} size={18} />
        ) : (
          <ShieldAlert color={theme.colors.gold} size={18} />
        )}
        <Text variant="title" style={styles.grow}>
          Bloqueio no iPhone
        </Text>
      </View>
      <Text variant="bodyMuted">{message}</Text>
      {result?.ok && result.unlinked > 0 ? (
        <Text variant="label" color={theme.colors.gold}>
          {result.unlinked} fonte(s) com limite mas sem app vinculado — vincule abaixo.
        </Text>
      ) : null}
      {needsAuth ? (
        <Button
          label="Autorizar Tempo de Uso"
          loading={authorizing}
          onPress={() => void authorize()}
        />
      ) : null}
      <Button
        label="Sincronizar agora"
        variant="outline"
        size="sm"
        loading={syncing}
        icon={<RefreshCw color={theme.colors.text} size={14} />}
        onPress={() => void sync()}
      />
    </Card>
  );
}

function describe(result: ReturnType<typeof useShieldSync>['result']): string {
  if (!result) return 'Sincronizando com o servidor…';
  if (result.ok) {
    const parts = [`${result.armed} monitorando`];
    if (result.blocked > 0) parts.push(`${result.blocked} bloqueada(s)`);
    if (result.unlocked > 0) parts.push(`${result.unlocked} liberada(s)`);
    if (result.filteredDomains > 0) {
      parts.push(`${result.filteredDomains} domínio(s) filtrado(s)`);
    }
    if (result.safariKeywords > 0) parts.push(`${result.safariKeywords} palavra(s)`);
    if (result.measuredIntervals > 0) {
      parts.push(`${result.measuredIntervals} trecho(s) medido(s)`);
    }
    return `Ativo · ${parts.join(' · ')}.`;
  }
  if (result.reason === 'unauthorized') {
    return 'Autorização de Tempo de Uso não concedida — o shield não pode subir.';
  }
  if (result.reason === 'unavailable') {
    return 'Este build não tem o módulo nativo de Screen Time.';
  }
  return `Falha no sync: ${result.message ?? 'erro desconhecido'}`;
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  grow: { flex: 1 },
});
