import * as Linking from 'expo-linking';

import { env } from './env';

/**
 * Abre uma rota do front web no navegador do aparelho.
 *
 * O app foi enxugado para ser **registro em movimento** (doc 08): marcar hábito,
 * treinar, comer, escrever no diário. Consulta, análise e gestão — História,
 * Loja, Personagem, Estatísticas, Conquistas, Skills, Histórico, builder de
 * treino — vivem só no web, que é onde o usuário passa o dia.
 *
 * Este helper é a ponte: em vez de a tela sumir sem explicação, o caminho
 * continua existindo, só que termina no navegador.
 *
 * Best-effort de propósito: falhar em abrir o navegador não pode derrubar a
 * tela que chamou.
 */
export async function openWeb(path = '/'): Promise<void> {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  try {
    await Linking.openURL(`${env.WEB_URL}${suffix}`);
  } catch {
    // sem navegador disponível (simulador cru, por exemplo) — silencioso
  }
}
