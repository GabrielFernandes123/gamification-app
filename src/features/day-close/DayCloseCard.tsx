import { Moon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import { DayCloseModal } from './DayCloseModal';
import { useDayCloseOpen } from './hooks/useDayClose';

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dataCurta(dia: string) {
  const [ano, mes, d] = dia.split('-').map(Number);
  return new Date(ano, mes - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * A faixa do fechamento na Início do celular.
 *
 * Só aparece com dia em aberto, e prioriza o dia ATRASADO quando existe: é o
 * caso em que a informação vale mais, porque ali ainda dá para responder antes
 * de o sistema decidir sozinho.
 */
export function DayCloseCard() {
  const abertos = useDayCloseOpen();
  const [visivel, setVisivel] = useState(false);
  const [dia, setDia] = useState<string | undefined>();

  const dias = abertos.data ?? [];
  if (dias.length === 0) return null;

  const hoje = dias.find((d) => d.day === d.today);
  const atrasado = dias.find((d) => d.day !== d.today);

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.head}>
          <Moon size={16} color={theme.colors.primary} />
          <View style={styles.headText}>
            <Text variant="title">
              {atrasado ? 'Um dia ficou em aberto' : 'Fechar o dia'}
            </Text>
            <Text variant="bodyMuted">
              {atrasado
                ? `${dataCurta(atrasado.day)} ainda não foi fechado. Fecha sozinho às ${hora(atrasado.deadlineAt)}.`
                : 'Responda o que faltou e veja o que o dia vai cobrar antes de selar.'}
            </Text>
          </View>
        </View>
        <Button
          label={atrasado ? `Fechar ${dataCurta(atrasado.day)}` : 'Fechar o dia'}
          fullWidth
          onPress={() => {
            setDia(atrasado ? atrasado.day : hoje?.day);
            setVisivel(true);
          }}
        />
      </Card>
      <DayCloseModal
        visible={visivel}
        day={dia}
        onClose={() => setVisivel(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  head: { flexDirection: 'row', gap: theme.spacing.sm },
  headText: { flex: 1, gap: 2 },
});
