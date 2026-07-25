import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, LockOpen, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { theme } from '@/theme/theme';

/**
 * Tela de VALIDAÇÃO do mecanismo de bloqueio do iPhone (Fase 1 do plano de iOS).
 *
 * Não é produto — é o menor caminho para provar, no aparelho, que as peças
 * funcionam antes de construir a Fase 2 em cima delas:
 *
 *   1. o módulo nativo existe no build            → isAvailable()
 *   2. a autorização de Tempo de Uso é concedida  → requestAuthorization()
 *   3. o usuário consegue escolher apps           → picker persistido
 *   4. o shield sobe por comando do app           → blockSelection()
 *   5. a tela de bloqueio mostra NOSSO texto      → updateShield()
 *   6. o shield desce                             → unblockSelection()
 *
 * A seleção é gravada pelo próprio módulo no App Group sob um id
 * (`SELECTION_ID`), e é esse id — não o token opaco — que passamos para
 * blockSelection. É o mesmo mecanismo que a Fase 2 vai usar por fonte.
 */
const SELECTION_ID = 'spike';

const AUTH_LABEL: Record<number, string> = {
  0: 'não solicitada',
  1: 'negada',
  2: 'concedida',
};

type SpikeState = {
  available: boolean;
  authStatus: number;
  hasSelection: boolean;
  shieldActive: boolean;
  /** Contagens da seleção. A Apple NÃO expõe os nomes (ver resumo abaixo). */
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
};

/**
 * "2 apps · 1 categoria" — é o máximo que dá para mostrar.
 *
 * `FamilyActivitySelection` devolve tokens opacos: o app hospedeiro consegue
 * contar o que foi escolhido, mas não ler nome nem bundle id. Renderizar o
 * nome real só é possível dentro de uma extension (SwiftUI `Label(token)`),
 * e de lá o valor não volta para cá. É privacidade por design, não limitação
 * da lib — ver 12-ios-limitacoes.md §3.1.2.
 */
function describeSelection(state: SpikeState): string {
  if (!state.hasSelection) return 'Nenhuma seleção ainda.';
  const parts: string[] = [];
  if (state.applicationCount > 0) {
    parts.push(`${state.applicationCount} app${state.applicationCount > 1 ? 's' : ''}`);
  }
  if (state.categoryCount > 0) {
    parts.push(`${state.categoryCount} categoria${state.categoryCount > 1 ? 's' : ''}`);
  }
  if (state.webDomainCount > 0) {
    parts.push(`${state.webDomainCount} site${state.webDomainCount > 1 ? 's' : ''}`);
  }
  return parts.length > 0 ? `Selecionado: ${parts.join(' · ')}` : 'Seleção vazia.';
}

/**
 * Lê o estado do módulo nativo. Tudo aqui é síncrono (o módulo consulta o
 * App Group e o ManagedSettingsStore local), então não há efeito assíncrono a
 * sincronizar — o estado é reconstruído sob demanda depois de cada ação.
 */
function readState(): SpikeState {
  const empty: SpikeState = {
    available: false,
    authStatus: 0,
    hasSelection: false,
    shieldActive: false,
    applicationCount: 0,
    categoryCount: 0,
    webDomainCount: 0,
  };
  if (!DeviceActivity.isAvailable()) return empty;

  const hasSelection = Boolean(DeviceActivity.getFamilyActivitySelectionId(SELECTION_ID));
  const metadata = hasSelection
    ? DeviceActivity.activitySelectionMetadata({ activitySelectionId: SELECTION_ID })
    : undefined;

  return {
    ...empty,
    available: true,
    authStatus: DeviceActivity.getAuthorizationStatus(),
    hasSelection,
    shieldActive: DeviceActivity.isShieldActive(),
    applicationCount: metadata?.applicationCount ?? 0,
    categoryCount: metadata?.categoryCount ?? 0,
    webDomainCount: metadata?.webDomainCount ?? 0,
  };
}

export default function ShieldSpikeScreen() {
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<SpikeState>(readState);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = () => setState(readState());

  async function authorize() {
    setBusy(true);
    try {
      await DeviceActivity.requestAuthorization('individual');
      toast.success('Autorização concedida.');
    } catch (error) {
      // negar cai aqui; a mensagem do iOS costuma ser opaca
      toast.error(error instanceof Error ? error.message : 'Autorização recusada');
    } finally {
      setBusy(false);
      refresh();
    }
  }

  /**
   * Escreve o texto e os botões da tela de bloqueio ANTES de levantar o shield.
   * Na Fase 2 isso vem da política (label, preço em ouro, minutos) e o botão
   * primário consome um grant da bolsa. Aqui ele só fecha, para provar que a
   * extension lê a configuração do App Group.
   */
  function configureShield() {
    DeviceActivity.updateShield(
      {
        title: 'Bloqueado pelo Evolve',
        subtitle: 'Este app passou do limite que você combinou com você mesmo.',
        primaryButtonLabel: 'Entendi',
        secondaryButtonLabel: 'Liberar (spike)',
      },
      {
        primary: { behavior: 'close' },
        secondary: { behavior: 'defer' },
      },
      'shieldSpike',
    );
  }

  function block() {
    setBusy(true);
    try {
      configureShield();
      DeviceActivity.blockSelection({ activitySelectionId: SELECTION_ID }, 'shieldSpike');
      toast.success('Shield levantado. Tente abrir o app escolhido.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao bloquear');
    } finally {
      setBusy(false);
      refresh();
    }
  }

  function unblock() {
    setBusy(true);
    try {
      DeviceActivity.unblockSelection({ activitySelectionId: SELECTION_ID }, 'shieldSpike');
      toast.success('Shield removido.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao desbloquear');
    } finally {
      setBusy(false);
      refresh();
    }
  }

  const authorized = state.authStatus === 2;

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Button
          label="Voltar"
          variant="ghost"
          icon={<ChevronLeft size={20} color={theme.colors.text} />}
          onPress={() => router.back()}
        />
      </View>

      <Text variant="h1">Spike do shield</Text>
      <Text variant="body" color={theme.colors.textMuted}>
        Validação do bloqueio nativo do iPhone. Siga de cima para baixo — cada passo
        depende do anterior.
      </Text>

      {!state.available ? (
        <Card style={styles.card}>
          <Text variant="title">Módulo indisponível</Text>
          <Text variant="body" color={theme.colors.textMuted}>
            {Platform.OS !== 'ios'
              ? 'Screen Time só existe no iOS. Abra esta tela no iPhone.'
              : 'Este build não tem o módulo nativo. Gere um development build novo com o plugin react-native-device-activity.'}
          </Text>
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <View style={styles.row}>
              <ShieldCheck size={18} color={theme.colors.text} />
              <Text variant="title">1 · Autorização de Tempo de Uso</Text>
            </View>
            <Text variant="body" color={theme.colors.textMuted}>
              Estado: {AUTH_LABEL[state.authStatus] ?? state.authStatus}
            </Text>
            {!authorized ? (
              <Button label="Autorizar" loading={busy} onPress={authorize} />
            ) : null}
            {state.authStatus === 1 ? (
              <Text variant="label" color={theme.colors.danger}>
                Negada. O iOS não pergunta de novo: remova em Ajustes → Tempo de Uso ou
                reinstale o app.
              </Text>
            ) : null}
          </Card>

          <Card style={styles.card}>
            <View style={styles.row}>
              <Smartphone size={18} color={theme.colors.text} />
              <Text variant="title">2 · Escolher os apps</Text>
            </View>
            <Text variant="body" color={theme.colors.textMuted}>
              {describeSelection(state)}
            </Text>
            {state.hasSelection ? (
              <Text variant="label" color={theme.colors.textMuted}>
                O iOS não entrega os nomes dos apps escolhidos — só a contagem.
              </Text>
            ) : null}
            <Button
              label={state.hasSelection ? 'Trocar seleção' : 'Escolher apps'}
              variant="outline"
              disabled={!authorized}
              onPress={() => setPickerOpen(true)}
            />
          </Card>

          <Card style={styles.card}>
            <View style={styles.row}>
              {state.shieldActive ? (
                <Lock size={18} color={theme.colors.danger} />
              ) : (
                <LockOpen size={18} color={theme.colors.text} />
              )}
              <Text variant="title">3 · Shield</Text>
            </View>
            <Text variant="body" color={theme.colors.textMuted}>
              {state.shieldActive
                ? 'Há bloqueio ativo NO APARELHO. Abra o app escolhido: deve aparecer a tela de bloqueio com o nosso texto.'
                : 'Nenhum bloqueio ativo no aparelho.'}
            </Text>
            <Text variant="label" color={theme.colors.textMuted}>
              Este estado é global: continua ativo se alguma fonte da aba Fontes estiver
              bloqueada, mesmo depois de remover o bloqueio do spike.
            </Text>
            <View style={styles.actions}>
              <Button
                label="Levantar"
                loading={busy}
                disabled={!authorized || !state.hasSelection}
                onPress={block}
              />
              <Button
                label="Remover"
                variant="outline"
                loading={busy}
                disabled={!state.shieldActive}
                onPress={unblock}
              />
            </View>
          </Card>

          <Button label="Reler estado" variant="ghost" onPress={refresh} />
        </>
      )}

      {pickerOpen ? (
        <DeviceActivity.DeviceActivitySelectionSheetViewPersisted
          familyActivitySelectionId={SELECTION_ID}
          headerText="Escolha os apps que o Evolve pode bloquear"
          onSelectionChange={refresh}
          onDismissRequest={() => {
            setPickerOpen(false);
            refresh();
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center' },
  card: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
});
