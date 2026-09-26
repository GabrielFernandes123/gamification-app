import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { apiFetch } from '@/lib/api';
import { theme } from '@/theme/theme';

/** Espelha `GET /narrative/diary` da API. */
export type DiaryEntry = {
  day: string;
  title: string | null;
  content: string;
  chips: string[] | null;
  mode: string | null;
  floor_number: number | null;
  floor_name: string | null;
};

export const diaryEntriesKey = ['diaryEntries'] as const;

export function useDiaryEntries() {
  return useQuery({
    queryKey: diaryEntriesKey,
    queryFn: () => apiFetch<DiaryEntry[]>('/narrative/diary?limit=60'),
  });
}

function dataLonga(dia: string) {
  const [ano, mes, d] = dia.split('-').map(Number);
  return new Date(ano, mes - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });
}

/**
 * O LIVRO no celular — o diário em ordem, agrupado por andar.
 *
 * ── Por que a leitura vive aqui e o resto não ────────────────────────────
 * O app é enxuto de propósito (doc 08): o que não é registro rápido abre no
 * web. A leitura do diário é a exceção que se justifica sozinha — ela é
 * consumo, não edição, e é no celular que se lê à noite, que é justamente
 * quando a entrada acabou de ser escrita no fechamento.
 *
 * ── Ordem ────────────────────────────────────────────────────────────────
 * Andares do mais fundo para o mais raso (a API devolve do dia mais novo para
 * o mais antigo) e, dentro do andar, os dias sobem — como num livro.
 */
export default function DiaryBookScreen() {
  const entries = useDiaryEntries();
  const dias = entries.data ?? [];

  const capitulos: {
    floor: number | null;
    name: string | null;
    dias: DiaryEntry[];
  }[] = [];
  for (const entrada of dias) {
    const atual = capitulos[capitulos.length - 1];
    if (atual && atual.floor === entrada.floor_number) atual.dias.push(entrada);
    else
      capitulos.push({
        floor: entrada.floor_number,
        name: entrada.floor_name,
        dias: [entrada],
      });
  }

  if (entries.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="h2">O livro</Text>
      {dias.length === 0 ? (
        <Text variant="bodyMuted">
          Nenhuma entrada ainda. A primeira nasce quando você fechar um dia.
        </Text>
      ) : (
        capitulos.map((capitulo) => (
          <View key={`${capitulo.floor}-${capitulo.dias[0].day}`}>
            <View style={styles.capituloHead}>
              <BookOpen size={14} color={theme.colors.textMuted} />
              <Text variant="label">
                {capitulo.floor
                  ? `Andar ${capitulo.floor}${capitulo.name ? ` — ${capitulo.name}` : ''}`
                  : 'Sem andar'}
              </Text>
            </View>

            {capitulo.dias.map((entrada) => (
              <Card key={entrada.day} style={styles.entrada}>
                <Text variant="title">
                  {entrada.title ?? dataLonga(entrada.day)}
                </Text>
                <Text variant="bodyMuted">{dataLonga(entrada.day)}</Text>
                {entrada.content.split(/\n+/).map((paragrafo, i) => (
                  <Text key={i} style={styles.paragrafo}>
                    {paragrafo}
                  </Text>
                ))}
                {entrada.chips?.length ? (
                  <Text variant="bodyMuted">{entrada.chips.join(' · ')}</Text>
                ) : null}
              </Card>
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  capituloHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  entrada: { gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
  paragrafo: { lineHeight: 22 },
});
