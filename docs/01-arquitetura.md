# 01 — Arquitetura

> **Dono de:** a divisão API ↔ Supabase, o que mora onde, o ledger, o núcleo
> (`_grant`), o contrato de módulo, o fluxo de uma request, auth e agendamento.
> Fórmulas → [02-economia](./02-economia.md). Modelo de dados → [06-dados](./06-dados.md).
> Princípios → [00-visao](./00-visao.md). Estado: ✅ implementado (Fase 0) — este
> doc reflete o código (`gamificacao-api` Nest + `gamificacao-app`). Detalhes de
> implementação que divergem do desenho conceitual estão marcados com **[impl]**.

---

## 1. Camadas

```
┌─ App (React Native / Expo) ───────────────────────────────┐
│  Fala SOMENTE com a API. Não chama RPC/PostgREST direto.   │
└───────────────────────────┬────────────────────────────────┘
                            ▼  HTTPS + JWT
┌─ API própria (NestJS / TypeScript) — onde a lógica mora ───┐
│  • Núcleo de economia (_grant) + ledger                    │
│  • Regras de cada módulo (hábito, treino, corpo, …)        │
│  • Combate, atributos, equipamento, classe                 │
│  • Temporadas/Boss + geração via IA (OpenRouter)           │
│  • Agendamento (closes diário/semanal/mensal, bosses)      │
└───────────────────────────┬────────────────────────────────┘
                            ▼  conexão Postgres (role dedicada)
┌─ Supabase = PLATAFORMA (não lógica) ──────────────────────┐
│  • Postgres (dados + constraints + colunas geradas + RLS)  │
│  • Auth (emite JWT)                                         │
│  • Storage (imagens de exercício, avatar, mídia)           │
└─────────────────────────────────────────────────────────────┘
```

**Por que assim:** capacidade nunca foi o gargalo; o problema é ergonomia de lógica
rica (combate/atributos/equip/boss) em PL/pgSQL. TS no Nest é testável, tipado e já
dominado pelo usuário. Supabase continua dando Postgres gerenciado + auth + storage
sem ops, e como é Postgres padrão **não há lock-in** (portável via `pg_dump`).
Ver [00-visao §2 princípio 4](./00-visao.md).

## 2. O que mora onde

| Responsabilidade | Onde | Observação |
|---|---|---|
| Toda mutação de jogo (XP/ouro/HP/atributo/streak) | **API** | Sempre via `_grant` dentro de transação |
| Regras de módulo (completar hábito, finalizar treino…) | **API** | Endpoints REST |
| Combate, atributos, equipamento, classe, boss | **API** | Lógica ramificada → TS |
| Geração de boss (IA) + agendamento | **API** | Nest `@Cron`; chama OpenRouter |
| Dados, FKs, constraints | **Postgres** | Integridade na base |
| `level`, `max_hp` (derivados de XP) | **Postgres** | Colunas GENERATED (mantidas) |
| RLS por `auth.uid()` | **Postgres** | Rede de segurança (defense-in-depth) |
| Auth / emissão de JWT | **Supabase Auth** | API valida o JWT |
| Imagens / mídia | **Supabase Storage** | |
| Leituras (listas, detalhes) | **API** | App não fala PostgREST direto (uma fronteira só) |
| CRUD puro (criar/editar hábito, skill, missão, recompensa, partes/treinos do corpo) | **API** | Endpoints REST dedicados; sem `_grant` (não é recompensa) |

**Decisão sobre leituras:** o app fala **só** com a API, inclusive para ler. Isso
custa mais endpoints, mas dá **uma fronteira única** (coerência > volume, princípio
5) e zero acoplamento do app ao formato do banco. A RLS continua ligada como rede de
segurança, não como contrato do app.

**[impl] CRUD puro via endpoints com whitelist.** O app **não** acessa tabelas
genericamente (não existe proxy `/data/:table`). Cada recurso tem rota dedicada
(`/skills`, `/sidequests`, `/habits`, `/store/rewards`, `/body-*`, `PATCH /profile`,
`PATCH /character/goals`). Um helper de servidor (`src/common/crud.ts`) escreve só
colunas de uma **whitelist por tabela** e injeta o `user_id` do JWT — então o cliente
nunca grava coluna de estado de jogo (gold/xp/hp) por uma rota de CRUD. Ressalva: o
app ainda envia o payload com **nomes de coluna iguais aos do banco**, então o
acoplamento ao formato caiu muito (sem PostgREST, sem escrita em coluna de jogo) mas
não é zero — fechar isso de vez exigiria DTOs com nomes próprios por recurso.

## 3. O ledger — a espinha

Tabela append-only `economy_events`: **toda** variação de XP/ouro vira uma linha.

Campos conceituais (modelo completo em [06-dados](./06-dados.md)):
`user_id`, `source_type` (habit | workout | sidequest | body_goal | diet | finance |
focus | boss | …), `source_id`, `xp_delta`, `gold_delta`, `essencia_delta`,
`occurred_on`, `meta` (jsonb).

O ledger destrava **de graça** (sem código por módulo):
- **Histórico unificado** — módulo novo aparece sozinho.
- **Conquistas genéricas** — "contar eventos do tipo X".
- **Streak de personagem** — "dias com ≥1 evento positivo".
- **Dano em boss** — derivado de eventos no período (mensais) / marcos (longos —
  ver [05](./05-temporadas-boss.md)).

## 4. O núcleo — `_grant`

Função única (serviço no Nest — `GrantService`) por onde passa **toda** recompensa.
**[impl]** Recebe o `client` da transação aberta pelo módulo (`grant(client, userId,
input)`) e aceita **dois modos** de entrada:

```
// modo açúcar — o núcleo aplica maestria (só XP), compõe multiplicadores e faz o split:
grant(client, userId, {
  sourceType, sourceId,
  base: { xp, gold },          // base da dificuldade (ver 02)
  xpMultipliers,  goldMultipliers,   // listas separadas (maestria/streak afetam XP e ouro de formas diferentes)
  skillIds:    { primary, secondary }, // 100% / 50%
  bodyPartIds: { primary, secondary }, // 100% / 50%
  essencia,                    // só boss
  occurredOn, meta,
}) -> ResultadoPadrao

// modo raw — quando o módulo precisa do valor final ANTES do grant
// (logs/linhas que conquistas contam, ou distribuição por exercício do treino):
grant(client, userId, {
  sourceType, sourceId,
  xp, gold,                    // já finais
  skillXp[], bodyPartXp[],     // distribuição explícita
  essencia, occurredOn, meta,
}) -> ResultadoPadrao
```

As fórmulas (maestria, bônus de streak, split 100/50) têm **fonte única** em
`src/economy/reward.ts`; o streak de personagem em `src/economy/character-streak.ts`.

O que `_grant` faz, em ordem (regras detalhadas em [02](./02-economia.md)):
1. calcula XP/ouro finais (modo açúcar: `base × multiplicadores × maestria`, maestria
   só no XP; modo raw: usa os valores recebidos);
2. grava linha no `economy_events` (inclui `essencia_delta`);
3. atualiza `characters` (total_xp, gold, essencia) — `level`/`max_hp` recalculam-se;
4. distribui XP pra skills e partes do corpo (100% / 50%) — split interno no modo
   açúcar, ou via arrays explícitos no modo raw;
5. detecta level-up (cura cheia) e dispara celebração;
6. avalia conquistas (genérico, via ledger);
7. **[impl]** `_sync_season`: aplica o dano de boss **deste evento** em TS
   (`BossEngineService.syncBossesFromEvent`), na mesma transação — substitui a antiga
   trigger SQL (ver §9);
8. retorna **resultado padronizado**: `{ xpGained, goldGained, essenciaGained,
   leveledUp, newLevel, newStreak, newAchievements, bossProgress }` — onde `newStreak`
   é o **streak de personagem** (§3); o streak de hábito continua sendo domínio do
   módulo, que pode sobrescrevê-lo na própria resposta.

Tudo numa **transação** — se qualquer passo falha, nada é aplicado (substitui a
atomicidade que a RPC dava de graça).

## 5. Contrato de módulo

Para anexar um módulo novo (ex.: Dieta), ele precisa de **apenas**:
1. **Tabelas de domínio** próprias (o que aquele módulo registra).
2. **Chamar `_grant`** ao concluir uma atividade (com seu `source_type`).
3. **Registrar-se no `module_registry`** (`id`, `nome`, `icone`, `cor`, `ordem`,
   `ativo`).

A partir daí o módulo **ganha de graça**: histórico, conquistas, elegibilidade pra
objetivos de boss, e presença no shell (a barra de navegação e os filtros de
histórico **enumeram o `module_registry`** — nada hardcoded). Detalhe por módulo em
[04-modulos](./04-modulos.md); shell em [08-navegacao-ux](./08-navegacao-ux.md).

## 6. Fluxo de uma request (exemplo: completar hábito)

```
1. App → POST /habits/:id/complete   (Authorization: Bearer <JWT Supabase>)
2. API valida o JWT → user_id
3. API abre transação:
     a. carrega o hábito, valida agendamento/limite do dia
     b. aplica as regras do hábito (proporcional, streak) — ver 02/04
     c. chama _grant(user_id, { sourceType:'habit', base, multipliers, skillIds })
4. _grant: XP/ouro → ledger → characters → skills/partes → level-up →
   conquistas → _sync_season (dano de boss em TS, mesma transação — §9)
5. commit
6. API responde { xpGained, goldGained, essenciaGained, leveledUp, newLevel,
   newStreak, newAchievements, bossProgress }
7. App atualiza HUD / dispara animações
```

## 7. Autenticação

Supabase Auth **emite** o JWT (login/signup já existentes). A **API valida** o JWT
(segredo/JWKS do Supabase) e extrai `user_id`. **[impl]** `AuthService` aceita tanto
`SUPABASE_JWT_SECRET` (HS256) quanto JWKS remoto; o `AuthGuard` injeta `user_id` em
toda rota. A API acessa o banco com **uma conexão Postgres própria** via
`DATABASE_URL` (`DbService` com pool `pg`) — **não** usa mais o anon key (o antigo
proxy que usava anon key + PostgREST foi removido). Toda query impõe `user_id`.

⚠️ Para a RLS valer como rede de segurança (e não só o `user_id` da query), a role do
`DATABASE_URL` deve ser uma **role dedicada** sujeita à RLS — **não** o owner/superuser
das tabelas (que ignora RLS). Garantir isso é config de banco, fora do código.

## 8. Agendamento

Os fechamentos (diário/semanal/mensal) e a geração/sincronização de boss são **jobs
da API** (Nest `@Cron`). O `pg_cron` deixa de conter lógica.

**[impl] crons em UTC fixo, data resolvida no fuso do usuário.** Em vez de amarrar o
agendador ao fuso SP, os jobs rodam em **UTC** e calculam a data efetiva **no fuso de
cada usuário** dentro da query (`now() at time zone coalesce(profiles.timezone,
'America/Sao_Paulo')`). Isso atende usuários em qualquer fuso. Jobs atuais:
- fechamento de hábito diário/semanal/mensal — `CloseService` (`'5 3 * * *'`, `'5 3 * * 0'`, `'5 3 1 * *'` UTC ≈ 00:05 SP);
- contra-ataque + recalibração de boss — `SeasonsService` (`'0 3 * * *'` UTC);
- restock de recompensas — `StoreService` (horário); expiração de metas corporais — `BodyService` (horário);
- geração de narrativa por IA — `NarrativeService` (a cada 3 dias).

## 9. Boss / combate — engine em TS + geração via IA

**[impl] toda a lógica de boss/combate vive na API (TS), em `BossEngineService`** —
geração (HP por média de XP × dias × escala do tier, com cap; fraqueza = módulo menos
usado; objetivos cross-module lidos do `module_registry`), dano por
Força/crítico/fraqueza, contra-ataque diário (esquiva por Agilidade, mitigação por
Vitalidade), recalibração/enrave, morte por modo (`death_mode`) e recompensas
(Essência, pontos de atributo, cargas, drop de equipamento). Determinístico: os rolls
de crítico/esquiva/drop usam **seed via md5** (sem aleatoriedade não-reprodutível);
clamps de segurança em HP/dano.

O **dano de um evento** é aplicado dentro do `_grant`, na **mesma transação** do
evento (passo 7 `_sync_season` → `syncBossesFromEvent`). Isso **substituiu a antiga
trigger SQL** `economy_events_sync_monthly_boss`: a trigger e **todas** as funções
PL/pgSQL de boss/atributo (`ensure_current_boss`, `sync_active_bosses_from_event`,
`resolve_boss_day`, `recalibrate_boss`, `complete_boss_if_needed`,
`apply_character_death_from_boss`, `current_boss_snapshot`, `allocate_attribute_point`,
`boss_attribute_total`, …) foram **dropadas** na migration
`20260607000000_fase0_retire_boss_pgsql_logic.sql`. As **tabelas/constraints/RLS**
de boss/temporada permanecem (movemos lógica, não dados — §10).

Geração roda por tier (mensal → anual). Engine determinística define os números; a IA
define tema/lore/personalização e propõe parâmetros dentro de faixas.

**Provedor: OpenRouter** (API única, compatível OpenAI, que roteia para vários
modelos — Claude, GPT, Gemini, etc.). Escolha alinhada ao princípio de não ficar
travado: troca-se o modelo por configuração, sem trocar código, com billing único.
A geração roda raríssimo (≈1×/mês por tier), então pode usar um modelo top sem
preocupação de custo, e cair pra um mais barato se quiser. Independente do modelo,
o boss volta como **JSON validado contra schema** (e a engine faz o clamp dos
números). Modelo default e o contrato da chamada em
[05-temporadas-boss](./05-temporadas-boss.md).

## 10. Migração a partir do estado atual

**[impl] Fase 0 concluída no código.** A transição (detalhe na Fase 0 do
[07-roadmap](./07-roadmap.md)) está implementada:
1. ✅ API Nest conectada ao mesmo Postgres (`DbService` via `DATABASE_URL`).
2. ✅ `economy_events` + `module_registry` + `_grant` (no serviço).
3. ✅ `complete_habit` / `complete_workout_session` / `complete_side_quest` /
   `complete_body_goal` portados de RPC → endpoints que usam `_grant`.
4. ✅ App aponta pra API: `supabase.rpc(...)` e acesso a tabela (`apiDb`/PostgREST)
   trocados por REST (`apiFetch`). Sobrou só `supabase.auth.*` e `supabase.storage.*`.
5. ✅ Leituras migradas para endpoints dedicados; o proxy `/data/:table` e o
   `apiDb` foram **removidos**; o `SUPABASE_ANON_KEY` não é mais usado no servidor.
6. ✅ **Boss/combate portado de PL/pgSQL → TS** (`BossEngineService`); trigger e
   funções SQL de boss aposentadas (migration `20260607000000…`).

As **migrations de schema continuam valendo** — movemos a *lógica*, não os *dados*.

> Pendências **não** cobertas aqui (não são de código): deploy da API com o código
> novo; smoke/validação em runtime; e garantir que a role do `DATABASE_URL` é
> dedicada (sujeita à RLS) — ver §7.

## 10.1 O ledger de migrations ✅ 🆕 (2026-08-06)

> Conhecimento operacional que quase se perdeu: vivia só num doc da raiz, fora de
> qualquer repositório.

Migrations são **arquivos SQL aplicados à mão**, e há dois scripts:

| Script | O que faz |
|---|---|
| `run-all-migrations.mjs` | aplica tudo que **falta**, consultando a tabela `_migrations` |
| `run-migration.mjs` | aplica **um** arquivo |
| `backfill-migrations.mjs` | registra em `_migrations` o que já foi aplicado |

### ⚠️ A armadilha que isso já causou

`run-migration.mjs` **não registrava nada** em `_migrations`. Quem aplicasse por
ele deixava a migration invisível — e o `run-all-migrations.mjs`, que pula o que
está registrado, tentaria **reaplicar**.

Medido em 2026-08-06: **63 de 119 migrations estavam fora do ledger**, desde
25/07. Treze delas **não eram idempotentes**. Rodar o `run-all` teria:

- **duplicado os itens da loja** (`unify_items`: `insert` sem `on conflict`);
- duplicado entradas do Codex;
- **zerado os streaks** dos hábitos negativos e resetado os tetos
  (`negative_period_ceiling`: `update` sem guarda).

### O conserto, e a regra que ficou

1. `run-migration.mjs` passou a **gravar em `_migrations` na mesma transação**, e
   a pular o que já está registrado (`--force` ignora).
2. `backfill-migrations.mjs` registrou as 63 — **provando cada uma antes**: ele
   extrai do SQL os objetos criados (tabela, coluna, tipo, índice, função) e
   confere no catálogo do Postgres. As que só mexem em dados exigem **evidência
   escrita** numa lista no próprio script, com a consulta usada.

> **A regra:** toda migration aplicada tem de estar em `_migrations`. E toda
> migration nova deveria ser escrita para ser **idempotente** — `if not exists`,
> `on conflict`, `update` com guarda. As três que quase causaram estrago não
> eram, e nada no processo teria avisado.

**Como conferir a qualquer momento:**

```bash
node scripts/run-all-migrations.mjs   # tem de imprimir só SKIP
```

## 11. Hospedagem

A API roda em qualquer lugar (Fly/Railway/Render/VPS) — não há amarração. Como tudo
é Postgres padrão + JWT padrão, trocar de hospedagem (ou até de provedor de banco)
não exige reescrever lógica.
