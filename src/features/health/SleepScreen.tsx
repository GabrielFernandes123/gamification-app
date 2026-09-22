import { Moon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';

import { useSleepSyncOutcome } from './useHealthSync';
import {
  SLEEP_WINDOW_DAYS,
  duracaoLonga,
  useSleepLogs,
  useSleepSettings,
  useSleepSummary,
  type SleepLog,
} from './useSleep';

/**
 * A tela do SONO.
 *
 * ── Por que ela precisou existir ─────────────────────────────────────────
 * O módulo tinha API, importador do HealthKit e critérios de recompensa, e
 * **nenhuma superfície**: o único sinal de vida era uma linha perdida em
 * Ajustes › Permissões. Com isso, "o relógio não sincronizou" e "o app nunca
 * leu nada" eram a mesma tela em branco — e ficaram meses assim.
 *
 * ── Por que ela é leitura, e não registro ────────────────────────────────
 * O app é enxuto de propósito (doc 08): aqui só entra o que se registra em
 * movimento. O sono não se registra, ele CHEGA — do relógio, pela madrugada.
 * Então esta tela faz duas coisas: mostra o que chegou e, quando nada chegou,
 * diz por quê. O ajuste dos critérios continua no web.
 */
export default function SleepScreen() {
  const logs = useSleepLogs();
  const summary = useSleepSummary();
  const settings = useSleepSettings();
  const noites = logs.data ?? [];

  return (
    <Screen scroll refreshing={logs.isRefetching} onRefresh={() => void logs.refetch()}>
      <View style={styles.header}>
        <Moon size={20} color={theme.colors.mana} />
        <Text variant="h2">Sono</Text>
      </View>

      <SyncCard />

      {summary.data && summary.data.nights > 0 ? (
        <Card style={styles.resumo}>
          <Text variant="label">Últimos {SLEEP_WINDOW_DAYS} dias</Text>
          <View style={styles.numeros}>
            <Numero
              valor={
                summary.data.avgMinutes
                  ? duracaoLonga(summary.data.avgMinutes)
                  : '—'
              }
              rotulo="média por noite"
            />
            <Numero
              valor={`${summary.data.nights}/${summary.data.daysInPeriod}`}
              rotulo="noites registradas"
            />
          </View>
          {settings.data ? (
            <Text variant="bodyMuted" style={styles.criterios}>
              {criteriosEmTexto(settings.data)}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {logs.isPending ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.loading} />
      ) : noites.length === 0 ? (
        <Card>
          <Text variant="bodyMuted">
            Nenhuma noite registrada nos últimos {SLEEP_WINDOW_DAYS} dias. Se o
            seu relógio grava o sono no app Saúde, o cartão acima diz onde a
            ligação está parando.
          </Text>
        </Card>
      ) : (
        noites.map((noite) => <NoiteCard key={noite.id} noite={noite} />)
      )}
    </Screen>
  );
}

/**
 * O estado da ponte com o Saúde.
 *
 * Fica no TOPO e não no rodapé de propósito: enquanto o sono não importa, esta
 * é a única informação útil da tela inteira.
 */
function SyncCard() {
  const { outcome, sync } = useSleepSyncOutcome();
  const [rodando, setRodando] = useState(false);

  async function rodar() {
    setRodando(true);
    try {
      await sync();
    } finally {
      setRodando(false);
    }
  }

  const cor = outcome ? SYNC_COLOR[outcome.state] : theme.colors.textSubtle;

  return (
    <Card accent={cor} style={styles.sync}>
      <Text variant="bodyMuted" color={cor} style={styles.syncTexto}>
        {outcome?.message ?? 'Sono ainda não sincronizado nesta sessão.'}
      </Text>
      <Button
        label="Sincronizar agora"
        size="sm"
        variant="outline"
        loading={rodando}
        onPress={() => void rodar()}
      />
    </Card>
  );
}

/** Mesma escala de gravidade do painel de permissões. */
const SYNC_COLOR: Record<string, string> = {
  ok: theme.colors.success,
  empty: theme.colors.gold,
  blocked: theme.colors.hp,
  denied: theme.colors.hp,
  error: theme.colors.hp,
  unavailable: theme.colors.textSubtle,
};

function NoiteCard({ noite }: { noite: SleepLog }) {
  const criterios = noite.criteriaMet ?? {};
  const atendidos = Object.values(criterios).filter(Boolean).length;
  const total = Object.keys(criterios).length;

  return (
    <Card style={styles.noite}>
      <View style={styles.noiteTopo}>
        <Text variant="bodyMedium">{dataCurta(noite.nightOn)}</Text>
        <Text variant="stat">{duracaoLonga(noite.durationMinutes)}</Text>
      </View>
      <Text variant="bodyMuted">
        {noite.bedtimeLocal && noite.wakeLocal
          ? `${noite.bedtimeLocal} às ${noite.wakeLocal}`
          : 'horário não registrado'}
        {noite.source === 'manual' ? ' · registrada à mão' : ''}
      </Text>
      {total > 0 ? (
        <Text
          variant="bodyMuted"
          color={atendidos === total ? theme.colors.success : theme.colors.gold}
        >
          {atendidos} de {total} critérios
        </Text>
      ) : null}
    </Card>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.numero}>
      <Text variant="stat">{valor}</Text>
      <Text variant="bodyMuted">{rotulo}</Text>
    </View>
  );
}

/**
 * Os critérios em uma linha.
 *
 * Só entram os LIGADOS: listar um alvo desligado faria a tela cobrar algo que
 * o sistema não cobra.
 */
function criteriosEmTexto(s: {
  bedtime_max: string;
  bedtime_enabled: boolean;
  wake_max: string;
  wake_enabled: boolean;
  min_minutes: number;
  min_duration_enabled: boolean;
}): string {
  const partes: string[] = [];
  if (s.bedtime_enabled) partes.push(`dormir até ${s.bedtime_max}`);
  if (s.wake_enabled) partes.push(`acordar até ${s.wake_max}`);
  if (s.min_duration_enabled) {
    partes.push(`ao menos ${duracaoLonga(s.min_minutes)}`);
  }
  return partes.length > 0
    ? `Critérios: ${partes.join(' · ')}.`
    : 'Nenhum critério ligado — as noites entram sem pontuar.';
}

function dataCurta(dia: string): string {
  const [ano, mes, d] = dia.split('-').map(Number);
  return new Date(ano, mes - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sync: { gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  syncTexto: { lineHeight: 20 },
  resumo: { gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  numeros: { flexDirection: 'row', gap: theme.spacing.lg },
  numero: { gap: 2 },
  criterios: { marginTop: theme.spacing.xs },
  noite: { gap: 4, marginBottom: theme.spacing.sm },
  noiteTopo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  loading: { marginTop: theme.spacing.lg },
});
