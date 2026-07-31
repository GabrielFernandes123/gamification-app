import * as Linking from 'expo-linking';

import { env } from './env';
import { supabase } from './supabase';

/**
 * Abre uma rota do front web no navegador do aparelho.
 *
 * O app foi enxugado para ser **registro em movimento** (doc 08): marcar hábito,
 * treinar, comer, escrever no diário. Consulta, análise e gestão — História,
 * Loja, Personagem, Estatísticas, Conquistas, Skills, Histórico, builder de
 * treino, metas do corpo, configurações — vivem só no web, que é onde o usuário
 * passa o dia.
 *
 * Este helper é a ponte: em vez de a tela sumir sem explicação, o caminho
 * continua existindo, só que termina no navegador.
 *
 * ── Por que a sessão viaja junto ──────────────────────────────────────────
 * O Safari do iPhone não compartilha nada com o app. Depois do corte, este
 * helper virou o **único** caminho para tudo que saiu — e sem sessão do outro
 * lado, cada um desses caminhos terminaria numa tela de login.
 *
 * Os tokens vão no **fragment**, que o navegador não envia ao servidor: não
 * entra em log de acesso nem em referer, e a `HandoffPage` do web apaga o hash
 * assim que restaura a sessão.
 *
 * Best-effort de propósito: falhar em abrir o navegador não pode derrubar a
 * tela que chamou.
 */
export async function openWeb(path = '/'): Promise<void> {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  try {
    await Linking.openURL(await buildUrl(suffix));
  } catch {
    // sem navegador disponível (simulador cru, por exemplo) — silencioso
  }
}

async function buildUrl(path: string): Promise<string> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token && session.refresh_token) {
      const to = encodeURIComponent(path);
      const fragment = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }).toString();
      return `${env.WEB_URL}/auth/handoff?to=${to}#${fragment}`;
    }
  } catch {
    // Sem sessão legível, cai no link cru: o pior caso vira a tela de login,
    // que é exatamente o comportamento anterior. Nunca deixar de abrir.
  }
  return `${env.WEB_URL}${path}`;
}
