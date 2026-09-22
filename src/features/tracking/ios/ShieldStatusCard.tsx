import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
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
  // Estado lido do PRÓPRIO iOS, não inferido do sync (ver abaixo).
  const [authStatus, setAuthStatus] = useState<number | null>(null);
  const disponivel = Platform.OS === 'ios' && DeviceActivity.isAvailable();

  const refreshAuth = useCallback(() => {
    if (!disponivel) return;
    try {
      setAuthStatus(DeviceActivity.getAuthorizationStatus());
    } catch {
      setAuthStatus(null);
    }
  }, [disponivel]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth, result]);

  if (!disponivel) return null;

  const ok = result?.ok === true;
  const message = describe(result);

  /**
   * A autorização vem do iOS, NÃO do resultado do sync.
   *
   * Antes o botão só aparecia com `result.reason === 'unauthorized'` — e o
   * `syncShield` chama `fetchPolicy()` ANTES de checar autorização. Numa
   * instalação nova com a API fora do ar, o sync morria em `reason: 'error'`
   * e o botão de autorizar nunca aparecia: dava para ficar sem nenhum caminho
   * na interface para conceder o Tempo de Uso.
   *
   * 0 = não perguntado · 1 = negado · 2 = concedido.
   */
  const concedido = authStatus === 2;
  const negado = authStatus === 1;

  async function authorize() {
    setAuthorizing(true);
    try {
      await DeviceActivity.requestAuthorization('individual');
      await sync();
    } catch {
      // negar cai aqui; o card continua mostrando o estado
    } finally {
      refreshAuth();
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
          {result.unlinked} fonte(s) sem app do iPhone vinculado — não medem nem
          bloqueiam. Vincule abaixo.
        </Text>
      ) : null}
      {result?.ok && result.failures.length > 0 ? (
        <Text variant="label" color={theme.colors.gold}>
          Falha ao armar: {result.failures.join(' · ')}
        </Text>
      ) : null}
      {/* Passo 1 do fluxo, sempre visível enquanto não concedido — sem ele o
          resto do módulo não sobe, e depender do sync para exibi-lo criava um
          beco sem saída quando o sync falhava por outro motivo. */}
      {!concedido ? (
        <>
          <Text variant="label" color={negado ? theme.colors.hp : theme.colors.gold}>
            {negado
              ? 'Autorização NEGADA. O iOS não pergunta de novo: vá em Ajustes → Tempo de Uso e libere o Evolve.'
              : 'O Tempo de Uso ainda não foi autorizado — sem isso o bloqueio não sobe.'}
          </Text>
          <Button
            label={negado ? 'Tentar autorizar de novo' : 'Autorizar Tempo de Uso'}
            loading={authorizing}
            onPress={() => void authorize()}
          />
        </>
      ) : null}
      <FallbackLog />
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

/** Uma queda no escudo genérico, como a extensão do iPhone registrou. */
type FallbackEntry = {
  at: string;
  kind: string;
  configKey: string;
  selectionsContaining: string[];
  selectionsMonitored: string[];
  liveActivities: number;
};

/**
 * As últimas vezes que a tela de bloqueio caiu no texto genérico, e por quê.
 *
 * A extensão só acha a configuração de uma seleção que (1) contém o app,
 * (2) tem uma atividade viva com o id dela no nome e (3) tem a configuração
 * gravada. O registro diz qual das três faltou — era isso que ninguém
 * conseguia ver quando o Instagram aparecia com "Abra o Evolve".
 */
function FallbackLog() {
  let entries: FallbackEntry[] = [];
  try {
    entries = DeviceActivity.userDefaultsGet<FallbackEntry[]>('evolveShieldFallbackLog') ?? [];
  } catch {
    entries = [];
  }
  if (entries.length === 0) return null;

  return (
    <View style={styles.log}>
      <Text variant="label" color={theme.colors.gold}>
        Bloqueios sem descrição ({entries.length})
      </Text>
      {entries.slice(0, 5).map((entry) => (
        <Text key={entry.at + entry.kind} variant="bodyMuted">
          {formatWhen(entry.at)} · {diagnose(entry)}
        </Text>
      ))}
    </View>
  );
}

function diagnose(entry: FallbackEntry): string {
  const onde = entry.kind.startsWith('site') ? 'o site' : 'o app';
  if (entry.selectionsContaining.length === 0) {
    return `${onde} não está em nenhuma seleção do Evolve (sobra de um vínculo antigo?)`;
  }
  if (entry.selectionsMonitored.length === 0) {
    return `a seleção existe, mas nenhuma atividade estava viva para ela (${entry.liveActivities} ativas no total)`;
  }
  return `a regra foi achada (${entry.selectionsMonitored[0]}), mas a configuração da tela não estava gravada`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  log: { gap: 2 },
});
