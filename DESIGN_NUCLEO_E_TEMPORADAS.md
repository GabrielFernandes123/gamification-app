# Design — Núcleo de Economia, Reconexão e Temporadas/Boss

> Documento vivo. Consolida a análise do sistema, a decisão arquitetural de base, a
> ordem de refatoração e o design do sistema de Temporadas/Boss.
> Criado em 2026-06-06. Status: **direção aprovada, ainda não implementada.**

---

## 1. Diagnóstico

O sistema é tecnicamente sólido (lógica em RPC no Postgres, colunas geradas, ledger
de auditoria imutável, RLS, crons de fechamento). O problema **não é qualidade, é
coesão**: existem **duas economias paralelas que se ignoram**.

```
ECONOMIA A (RPG clássico)            ECONOMIA B (fitness)
  Personagem: XP, nível, HP, ouro      Body parts: XP e nível PRÓPRIOS
  Skills: XP próprio                    Medidas corporais: dado puro, 0 gamificação
        ▲                                     │
        │ hábitos / side quests               │ (não retroalimenta nada)
        └─────────────────────────────────────┘
              treino joga XP no personagem MAS
              body parts sobem num trilho isolado
```

Sintomas concretos:
- **Body parts** sobem de nível e isso não faz nada.
- **Medidas corporais** são um diário desconectado (registra e não ganha nada).
- **Skills** sobem de nível mas o nível é decorativo (skill nv15 = skill nv1).
- Cada módulo reimplementa XP/ouro/skill/conquistas no seu próprio RPC → **adicionar
  módulo novo dói**.
- **Falta objetivo macro**: no late-game, XP/ouro não têm para onde ir.
- **Ouro superproduzido** sem ralo real.
- **Streak é por-hábito**, sem narrativa global de consistência.
- **Morte hardcore** (HP=0 zera tudo) pode desmotivar num app de uso pessoal e longo.

---

## 2. Decisão-espinha: núcleo de economia + ledger único

Separar **domínio** (rico, específico por módulo) de **economia** (genérica, única).

```
DOMÍNIO (específico por módulo)          NÚCLEO (genérico, um só)
  habits / habit_logs                      app._grant(user, source, base,
  workout_sessions / sets                      mults, skills[], parts[])
  side_quests                      ──────▶   ├─ calcula XP/ouro + bônus streak
  body_goals                                 ├─ skill primária 100% / sec 50%
  [dieta] [finanças] [foco] (novos)          ├─ body part XP
                                             ├─ grava no LEDGER  ◀── peça-chave
                                             ├─ avalia conquistas
                                             ├─ level-up / heal
                                             └─ retorno padronizado
```

**Ledger append-only** `economy_events`: cada variação de XP/ouro vira uma linha com
`source_type` (habit | workout | sidequest | body_goal | diet | finance | focus |
boss…), `source_id`, `xp_delta`, `gold_delta`, `occurred_on`.

O ledger destrava **de graça**:
- **Histórico/War Room unificado** — módulo novo aparece sozinho.
- **Conquistas genéricas** — "contar eventos do tipo X".
- **Streak de personagem** — "dias com ≥1 evento positivo".
- **Boss fights** — dano no boss derivado do ledger no período.

**Contrato de módulo** (o que torna pluggável): um módulo novo só precisa de
(1) suas tabelas de domínio, (2) chamar `_grant` ao concluir uma atividade,
(3) registrar-se num `module_registry` (id, nome, ícone, cor, ordem). O shell de
navegação, os filtros de histórico e os objetivos de temporada **enumeram os módulos
dinamicamente** — sem lista hardcoded em lugar nenhum.

---

## 3. Ordem de correção (fim-a-fim, app nunca quebra)

### Fase 0 — Núcleo *(fundação, maior esforço; refator invisível)*
- `economy_events` (ledger) + `app._grant(...)` único + `module_registry`.
- Migrar `complete_habit`, `complete_workout_session`, `complete_side_quest`,
  `complete_body_goal` para chamarem `_grant` (mesmo comportamento externo).

### Fase 1 — Reconectar as economias soltas
- **Maestria** de skill/body part: nível dá bônus de XP no `_grant`.
- **Streak de personagem** no HUD, lido do ledger.
- Ancorar XP de **treino** na escala de `difficulty_levels`.

### Fase 2 — Higiene de dados
- Remover/dar função a campos mortos (`daily_*_goal`, `body_parts.color`,
  `fitness_exercises.category/notes`, `body_goals.icon_name/media_url`).
- Implementar `body_goals.deadline` (vence e dá feedback).
- Side quest vencida com consequência.
- Medida registrada → avalia metas de medida na hora.
- Restock automático de recompensas (cron).

### Fase 3 — Shell de navegação pluggável
- Unificar comportamento das abas do **Corpo** (tudo painel + modais p/ CRUD).
- Remover portas duplicadas (Skills/SideQuests: só telas via dashboard).
- Regra única modal vs. tela; corrigir "Histórico".
- Barra de abas + filtros de histórico lendo do `module_registry`.

### Fase 4 — Módulos novos *(baratos agora)*
1. **Dieta** — fecha o pilar corpo; reusa engine de hábitos + medidas.
2. **Finanças** — melhor encaixe na economia de ouro.
3. **Foco/Pomodoro** — timer manual que credita XP (contorna limitação iOS).

### Fase 5 — Temporadas/Boss *(capstone)*
- `seasons` + `season_objectives` + `_sync_season`.

### Fase 6 — Polimento de economia
- Conquistas raras com recompensa; calibrar ouro; suavizar morte hardcore.

**Lógica da ordem:** Fase 0 paga tudo; 1-2 colhem ganhos e validam o núcleo; 3 torna
o shell pluggável; 4 adiciona módulos quase de graça; 5 amarra num objetivo macro;
6 afina.

---

## 4. Temporadas / Boss — design base

**Conceito:** camada POR CIMA de todos os módulos (não é módulo isolado). Uma
**Temporada** é uma janela de tempo com um **Boss** que tem HP. Você "ataca" o boss
cumprindo atividades em qualquer módulo; o boss "ataca de volta" se você falhar.

**Mecânicas:**
- **HP do boss / dano do jogador:** dano diário derivado do XP no ledger (o boss não
  precisa de lógica de pontuação nova — lê o que os módulos já produziram).
- **Contra-ataque:** falhar a meta diária aciona `_apply_damage` existente (dá função
  à `daily_xp_goal`, hoje decorativa).
- **Quadro de objetivos cross-module:** 5-8 objetivos puxados de módulos diferentes,
  lendo o ledger por `source_type` (módulos novos viram objetivos automaticamente).
- **Fases:** 75/50/25% de HP mudam o boss (novos objetivos / enrage).
- **Ralo de ouro:** consumíveis de batalha comprados com ouro (resolve superprodução).
- **Desfecho:** vitória → recompensa exclusiva; derrota sem reset brutal (suaviza a
  morte hardcore — tensão migra para a temporada, que é recuperável).

**Modelo de dados (enxuto):**
- `seasons`: theme, starts_on, ends_on, boss_max_hp, boss_current_hp, status,
  reward_spec.
- `season_objectives`: season_id, source_type, spec (jsonb), target, progress,
  completed, boss_damage.
- Helper `app._sync_season(user)` chamado após cada `_grant` (ou no cron diário).

---

## 5. Em discussão (próximas decisões)

Tópicos levantados para aprofundar, ainda **não fechados**:
- **Sistema de atributos/build:** skills e body parts mapeiam para atributos fixos
  do sistema (agilidade → bônus de dano; resistência/peito → menos dano recebido…),
  deixando a batalha dinâmica conforme o "build" da vida real.
- **Criação do boss:** mecanismo (catálogo paramétrico vs. procedural vs. geração via
  IA analisando os dados do usuário).
- **Múltiplos boss por período:** mensal / trimestral / semestral / anual (aninhados).
- **Recompensas:** aprofundar o que gera vontade de jogar (foco principal).

> Estas seções serão preenchidas conforme as decisões forem fechadas.
