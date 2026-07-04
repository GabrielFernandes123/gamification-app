import { useRouter, type Href } from 'expo-router';
import { createElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import { moduleIcon } from './moduleIcon';
import { useModules } from './useModules';

/**
 * Destino de cada módulo no app. A LISTA vem do `module_registry` (nada
 * hardcoded): um módulo novo ativado aparece sozinho. Só a resolução de rota
 * (inerente ao frontend) mora aqui; chave desconhecida cai no Histórico
 * filtrável até ganhar tela própria.
 */
const ROUTES: Record<string, Href> = {
  habit: '/(app)/(tabs)/habits',
  workout: '/(app)/(tabs)/body',
  body_goal: '/(app)/(tabs)/body',
  body_measurement: '/(app)/(tabs)/body',
  sidequest: '/(app)/sidequests',
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
            onPress={() => router.push(ROUTES[m.key] ?? '/(app)/history')}
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
