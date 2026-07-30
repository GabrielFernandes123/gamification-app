import * as DeviceActivity from 'react-native-device-activity';
import { Platform, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTrackingSources } from '@/features/tracking/hooks/useTracking';
import { openWeb } from '@/lib/openWeb';
import { theme } from '@/theme/theme';

import { ShieldStatusCard } from './ShieldStatusCard';
import { SourceShieldRow } from './SourceShieldRow';

/**
 * Escudo do iPhone dentro de Configurações.
 *
 * A tela de Tempo de tela saiu do app (doc 08: só registro em movimento) — toda
 * a configuração de fontes, limites, janelas e dispositivos vive no web. **Mas
 * uma parte não pode sair**: o seletor de apps do iOS devolve um token opaco e
 * só funciona no próprio aparelho. Sem esta tela, não haveria como vincular um
 * app do iPhone a uma fonte rastreada.
 *
 * Por isso aqui fica só o que é impossível no navegador: status da autorização
 * e o vínculo app↔fonte. O resto é um link.
 */
export function ShieldPanel() {
  const sources = useTrackingSources();

  if (Platform.OS !== 'ios' || !DeviceActivity.isAvailable()) return null;

  // Só fontes que já têm limite configurado (no web) fazem sentido bloquear.
  const blockable = (sources.data ?? []).filter(
    (source) => source.block_after_seconds != null,
  );

  return (
    <View style={styles.section}>
      <ShieldStatusCard />

      <Card style={styles.card}>
        <View>
          <Text variant="title">Apps deste iPhone</Text>
          <Text variant="bodyMuted">
            Vincule cada fonte ao app correspondente. A seleção só pode ser feita
            aqui — o iOS não expõe essa escolha para o navegador.
          </Text>
        </View>

        {blockable.length === 0 ? (
          <Text variant="bodyMuted">
            Nenhuma fonte com limite ainda. Configure os limites no site e volte
            aqui para escolher os apps.
          </Text>
        ) : (
          blockable.map((source) => (
            <SourceShieldRow
              key={source.id}
              sourceId={source.id}
              matcher={source.matcher}
              label={source.label ?? source.matcher}
              blockAfterSeconds={source.block_after_seconds}
              iosMeasure={source.ios_measure}
              onLinked={() => void sources.refetch()}
            />
          ))
        )}

        <Text
          variant="label"
          color={theme.colors.primary}
          onPress={() => void openWeb('/tracking')}
        >
          Abrir Tempo de tela no site
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.md,
  },
});
