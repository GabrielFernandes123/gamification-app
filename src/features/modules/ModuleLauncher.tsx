import { useRouter, type Href } from 'expo-router';
import { createElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { openWeb } from '@/lib/openWeb';
import { theme } from '@/theme/theme';
import { moduleIcon } from './moduleIcon';
import { useModules } from './useModules';

/**
 * Destino de cada módulo. A LISTA vem do `module_registry` (nada hardcoded):
 * um módulo novo ativado aparece sozinho. Só a resolução de destino, que é
 * inerente ao frontend, mora aqui.
 *
 * Depois do enxugamento (doc 08: app = registro em movimento), a maioria dos
 * módulos **não tem tela no app** — eles vivem no web. Então o fallback deixou
 * de ser o Histórico (que saiu) e passou a ser **abrir o módulo no navegador**,
 * usando a própria `key` como caminho. Módulo novo continua funcionando sozinho:
 * se tiver tela no app, entra no mapa; se não, cai no web.
 */
const APP_ROUTES: Record<string, Href> = {
  habit: '/(app)/(tabs)/habits',
  workout: '/(app)/(tabs)/body',
  cardio: '/(app)/(tabs)/body',
  body_goal: '/(app)/(tabs)/body',
  body_measurement: '/(app)/(tabs)/body',
  sleep: '/(app)/(tabs)/body',
  // Nutrição é painel dentro de Corpo; Diário tem aba própria.
  nutrition: '/(app)/(tabs)/body',
  journal: '/(app)/(tabs)/diario',
};

/**
 * Caminho no web para os módulos sem tela no app.
 *
 * O fallback é `/${key}`, e ele **só funciona quando a rota existe do outro
 * lado** — foi assim que `nutrition` e `journal` quase viraram um 404 antes de
 * as páginas existirem. Quem adicionar módulo aqui confere a rota no
 * `gamificacao-web/src/App.tsx`.
 */
const WEB_ROUTES: Record<string, string> = {
  sidequest: '/sidequests',
  tracking: '/tracking',
  reading: '/leitura',
  boss: '/historia',
  event: '/',
  // O cartão de declarar mora na Início; o web é onde se vê a calibração.
  plan: '/plan',
  bucket: '/bucket',
  relationship: '/relationships',
  work: '/work',
  // As quatro abaixo estão `ativo = false` no registry hoje, e é só por isso
  // que o fallback `/${key}` nunca as levou para o NotFoundPage — `achievement`
  // daria `/achievement`, e a rota é `/achievements`. Mapeadas para o dia em
  // que alguém as ligar, que é justamente quando ninguém vai lembrar disto.
  achievement: '/achievements',
  store: '/store',
  death: '/character',
  build: '/character',
};

/** Atalhos de módulo na Início, enumerados do registry (08 §6.1). */
export function ModuleLauncher() {
  const router = useRouter();
  const modules = useModules();
  const active = (modules.data ?? []).filter((m) => m.ativo);
  if (active.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Text variant="title">Módulos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {active.map((m) => (
          <Pressable
            key={m.key}
            style={styles.item}
            onPress={() => {
              const inApp = APP_ROUTES[m.key];
              if (inApp) router.push(inApp);
              else void openWeb(WEB_ROUTES[m.key] ?? `/${m.key}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={m.nome}
          >
            <View style={[styles.icon, { borderColor: m.cor }]}>
              {createElement(moduleIcon(m.icone), { color: m.cor, size: 20 })}
            </View>
            <Text variant="label" numberOfLines={1}>{m.nome}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  grid: { gap: theme.spacing.md, paddingRight: theme.spacing.sm },
  item: { width: 76, alignItems: 'center', gap: theme.spacing.xs },
  icon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
