# 07 — Roadmap (Fases de Construção)

> **Dono de:** a ordem de construção. O "o quê" de cada coisa mora nos docs de domínio;
> aqui é só o "quando" e o "por que nessa ordem".
> **Estado: ✅ Fases 0–7 concluídas** (varredura 2026-08-04).
> Legenda: 🧱 infra pesada · ✨ valor visível ao usuário.

> ⚠️ **Este doc virou histórico.** Ele descreve como o núcleo foi construído, e
> essa parte não muda mais. O que está em andamento **não mora aqui** — o placar
> vivo é o [14 §11](./14-backlog-modulos-e-mecanicas.md), que é onde a leva de
> 2026-07/08 (13 módulos e mecânicas construídos fora deste roadmap) é rastreada.
> Se você quer saber "o que falta", vá para o 14; se quer saber "como chegamos
> aqui", fique.

---

## Princípio da ordem
Cada fase **deixa o app funcionando** e **destrava a seguinte**. A Fase 0 é o
investimento que paga todo o resto; as fases 1–3 colhem ganhos e validam o núcleo; a
4–6 constroem a nova camada de jogo (build → boss → narrativa); a 7 afina. Nenhuma fase
quebra o que já existe — portamos lógica, não dados ([01 §10](./01-arquitetura.md),
[06 §12](./06-dados.md)).

Esse princípio se sustentou: nenhuma fase precisou ser refeita, e a Fase 0 é
literalmente o que tornou possível acrescentar 13 módulos depois sem tocar no
núcleo — um módulo novo é *tabelas + uma chamada a `_grant` + uma linha no
registry*.

---

## Fase 0 — Fundação: API + ledger + núcleo 🧱 ✅
**Objetivo:** mover a lógica para a API e instalar a espinha, sem mudar o comportamento.
- Subir a **API Nest** conectada ao mesmo Postgres; validar o JWT do Supabase ([01 §7](./01-arquitetura.md)).
- Criar `economy_events` + `module_registry` + o núcleo **`_grant`** ([01 §3/§4](./01-arquitetura.md), [02 §9](./02-economia.md)).
- Portar `complete_habit` / `complete_workout_session` / `complete_side_quest` /
  `complete_body_goal` de RPC → **endpoints** que usam `_grant` (saída idêntica).
- Apontar o **app para a API**; aposentar RPCs antigas; fechamentos em **Nest `@Cron`**.
- **Resultado:** comportamento igual; lógica na camada certa; ledger gravando tudo.

**Onde vive:** `gamificacao-api/src/economy/grant.service.ts`, `src/db/`, as migrations
`fase0_*`. O invariante `sum(economy_events.gold_delta) == characters.gold` é o teste
que prova que a fase segurou.

## Fase 1 — Reconectar economia + insumos de build ✨ ✅
- **Maestria:** nível da skill primária → bônus de XP no `_grant` ([02 §5.2](./02-economia.md)).
- **Streak de personagem** no HUD, lido do ledger ([02 §6](./02-economia.md)).
- **Ancorar XP de treino** na escala de dificuldade.
- **Insumos de atributo**: `skills.attribute_key`, `body_parts.attribute_key`,
  `characters.essencia`/`class`, `character_attribute_points`.

**Onde vive:** `src/economy/character-streak.ts`, `src/build/build.service.ts`.

## Fase 2 — Higiene de dados ✨ ✅
- Campos mortos resolvidos; `body_goals.deadline` implementado; consequência de
  side quest vencida; medida registrada → evento trivial no ledger; restock automático.

## Fase 3 — Shell de navegação pluggável ✨ ✅ (e depois superada)
- Navegação lê o `module_registry`; abas do Corpo unificadas; portas duplicadas removidas.

> **Nota histórica:** esta fase foi feita **e depois superada** pelo enxugamento de
> 2026-07-30 ([08 §0](./08-navegacao-ux.md)), que tirou Skills, Side Quests e
> Histórico do app inteiro e deixou 4 abas. O item "corrigir Histórico" perdeu o
> objeto: a tela não existe mais no app, vive no web.

## Fase 4 — Build: Atributos, Equipamento e Classe ✨ ✅
- Cálculo do atributo total; `equipment_catalog` + slots + `required_level`;
  auto-desequipar na morte; classe +15%; tela de personagem.

**Onde vive:** `src/build/build.controller.ts` (`attributes`, `equipment`,
`equipment/:id/equip|purchase|upgrade`, `class`, `scars`).

## Fase 5 — Temporadas / Boss (combate) ✨ ✅
- Tabelas de boss; combate determinístico com clamp; objetivos cross-module;
  recompensas (pontos, Essência, drop, cargas).

**Onde vive:** `src/boss/boss-engine.service.ts`, `src/seasons/`, `src/objectives/`.

## Fase 6 — Narrativa / IA (imersão) ✨ ✅
- OpenRouter em camadas; esqueleto do arco; recalibração; tela da história;
  fallback sem IA.

**Onde vive:** `src/narrative/narrative.controller.ts` (`story/generate`, `saga`,
`configure`, `boss/recalibrate`, `retrospective/*`).

## Fase 7 — Polimento e expansão de economia ✨ ✅
- Conquistas com recompensa; ouro calibrado; **morte configurável**
  (`soft`/`seasonal`/`hardcore`) — e é o que escalona a intensidade das cicatrizes.
- **Tiers longos ligados**: `POST /seasons/upgrade` e o `?tier=` da história.
- Os módulos que este doc listava como "futuro, fora do roadmap" **existem**:
  Nutrição/Dieta (`nutrition.controller.ts`) e Foco (`GET /tracking/focus`).
  Finanças segue não construído — está no [14](./14-backlog-modulos-e-mecanicas.md).

---

## Depois deste roadmap

O núcleo acabou aqui. De 2026-07-30 a 2026-08-04 vieram, **em cima da Fase 0 e sem
tocá-la**: Diário, Nutrição, Plano do dia + Modo trégua, Sono/HealthKit, Cardio,
Leitura, Bucket list, Relacionamentos, Trabalho (techSpace), Eventos diários, Codex,
Cicatrizes, Nêmese, Reputação, Ferrugem de skill, Limite de WIP, Preço que respira,
Retrospectiva narrada e o tracking de tempo de tela.

Nada disso está listado acima porque nada disso precisou de fase própria — é a
prova retroativa de que a ordem estava certa. O rastreamento é no
[14 §11](./14-backlog-modulos-e-mecanicas.md).

### Enxugamento do app — 2ª passada ✅ (2026-07-31)
Não é fase de roadmap (não destrava nada; é dívida de superfície), mas mexeu em código
de todos os lados e merece registro:

- **App:** Configurações virou **Permissões** (as outras vivem no web) · Corpo perdeu
  metas, gráfico, resumo e ficha de divisão · Início virou a tela das decisões do dia.
  `src/app`: **6.000 → 3.649 linhas** (−39%); `features/objectives`, `features/season/hooks`,
  `features/warroom`, `features/settings` e `features/health/hooks/useSleep.ts` ficaram
  órfãos e saíram, junto com 21 hooks de `useBody.ts`.
- **API:** `GET /today` — agregado novo que alimenta o widget do iPhone e substitui as
  nove queries que a Início fazia.
- **Web:** `/auth/handoff` — recebe a sessão do app pelo fragment, para os links do
  celular não caírem no login.

Detalhe e razões em [08 §0.0 e §10.1](./08-navegacao-ux.md).

---

## Resumo visual
```
0 Fundação (API+ledger+_grant) 🧱          ✅
1 Reconectar (maestria, streak, insumos)   ✅
2 Higiene                                  ✅
3 Shell pluggável                          ✅ (superada pelo enxugamento, 08 §0)
4 Build (atributos+equip+classe)           ✅
5 Boss (combate+recompensas)               ✅
6 Narrativa/IA (história+personalização)   ✅
7 Polimento (ouro, morte, tiers longos)    ✅
─────────────────────────────────────────────
  enxugamento do app, 2ª passada           ✅ (2026-07-31)
  daqui em diante: 14 §11
```
