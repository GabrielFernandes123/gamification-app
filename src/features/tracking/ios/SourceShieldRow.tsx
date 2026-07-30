import { Link2, Link2Off } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useUpdateSource, type IosMeasure } from '@/features/tracking/hooks/useTracking';
import { theme } from '@/theme/theme';
import { hasLinkedApp, selectionIdFor } from './shieldSync';
import { syncShieldOnce } from './useShieldSync';

/**
 * Vínculo "este app do iPhone É esta fonte".
 *
 * O picker do iOS devolve um token opaco, então não existe como o app casar
 * sozinho o app escolhido com o `matcher` da fonte: quem faz esse vínculo é o
 * usuário, uma vez por fonte. A seleção fica gravada no App Group sob
 * `src-<matcher>`, e é esse id que o shield usa depois.
 *
 * Escolha UM app por fonte — é o que permite limite e preço individuais.
 */
export function SourceShieldRow({
  sourceId,
  matcher,
  label,
  blockAfterSeconds,
  iosMeasure,
  onLinked,
}: {
  sourceId: string;
  matcher: string;
  label: string;
  blockAfterSeconds: number | null;
  iosMeasure: IosMeasure;
  onLinked?: () => void;
}) {
  const updateSource = useUpdateSource();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [linked, setLinked] = useState(() => hasLinkedApp(matcher));

  if (Platform.OS !== 'ios' || !DeviceActivity.isAvailable()) return null;

  const selectionId = selectionIdFor(matcher);

  function afterChange() {
    setLinked(hasLinkedApp(matcher));
    onLinked?.();
  }

  /**
   * Troca quem mede esta fonte. O servidor passa a ignorar os eventos do
   * Atalhos para ela (guard do EventsService), então a virada é segura mesmo com
   * automações antigas ainda ativas — nada é contado duas vezes.
   */
  async function switchMeasure() {
    const next: IosMeasure =
      iosMeasure === 'device_activity' ? 'shortcuts' : 'device_activity';
    setSwitching(true);
    try {
      await updateSource.mutateAsync({ id: sourceId, ios_measure: next });
      await syncShieldOnce(); // rearma a escada de limiares já com o novo modo
    } finally {
      setSwitching(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {linked ? (
          <Link2 color={theme.colors.success} size={16} />
        ) : (
          <Link2Off color={theme.colors.textMuted} size={16} />
        )}
        <Text variant="bodyMuted" style={styles.grow}>
          {linked ? 'App do iPhone vinculado' : 'Nenhum app do iPhone vinculado'}
        </Text>
        <Button
          label={linked ? 'Trocar' : 'Vincular'}
          variant="outline"
          size="sm"
          onPress={() => setPickerOpen(true)}
        />
      </View>

      {linked && blockAfterSeconds == null ? (
        <Text variant="label" color={theme.colors.gold}>
          Defina o limite de bloqueio nesta fonte, senão o shield nunca sobe.
        </Text>
      ) : null}

      {linked ? (
        <View style={styles.row}>
          <Text variant="bodyMuted" style={styles.grow}>
            {iosMeasure === 'device_activity'
              ? 'Medido pelo Tempo de Uso do iOS'
              : 'Medido pelas automações do Atalhos'}
          </Text>
          <Button
            label={iosMeasure === 'device_activity' ? 'Usar Atalhos' : 'Medir pelo iOS'}
            variant="outline"
            size="sm"
            loading={switching}
            onPress={() => void switchMeasure()}
          />
        </View>
      ) : null}

      {iosMeasure === 'device_activity' ? (
        <Text variant="label" color={theme.colors.textMuted}>
          Apague as 2 automações deste app no Atalhos — o servidor já ignora os
          eventos delas, mas elas ficariam rodando à toa.
        </Text>
      ) : (
        // O padrão da fonte é `shortcuts`: vincular o app NÃO faz o iPhone medir.
        // Sem as duas automações no Atalhos, o tempo desta fonte fica em zero.
        <Text variant="label" color={theme.colors.gold}>
          O tempo só é contado pelas 2 automações do Atalhos. Sem elas, toque em
          &ldquo;Medir pelo iOS&rdquo;.
        </Text>
      )}

      {pickerOpen ? (
        <DeviceActivity.DeviceActivitySelectionSheetViewPersisted
          familyActivitySelectionId={selectionId}
          headerText={`Qual app do iPhone é "${label}"?`}
          footerText="Escolha apenas um app."
          onSelectionChange={afterChange}
          onDismissRequest={() => {
            setPickerOpen(false);
            afterChange();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  grow: { flex: 1 },
});
