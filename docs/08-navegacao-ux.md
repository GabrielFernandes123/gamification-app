# 08 — UI/UX: Design System, Padrões de Tela e Navegação

> **Dono de:** o design system (tokens, componentes), os arquétipos de tela e suas
> regras de padronização, a navegação pluggável e a cura dos problemas atuais, e onde as
> telas novas se encaixam. Módulos/registry → [04](./04-modulos.md). Telas novas
> (personagem, boss, história) referenciam [03](./03-atributos-build.md)/[05](./05-temporadas-boss.md)/[09](./09-narrativa-e-ia.md).
> Estado: 📋 padrão a consolidar. Legenda: ✅ já existe · 🆕 padrão novo · 🔄 correção.

---

## 1. Princípios de UI/UX
1. **Consistência > criatividade por tela.** A mesma ação se faz do mesmo jeito em todo
   módulo. Tela nova reusa arquétipo existente (§4), não inventa layout. **Exceção
   sancionada:** a tela-assinatura **História/Boss** (§8) pode quebrar os arquétipos por
   imersão — desde que fique dentro dos design tokens (§2).
2. **Uma fronteira visual por tipo de conteúdo.** Lista, detalhe, formulário, painel e
   modal têm cada um seu arquétipo; não se misturam.
3. **Hierarquia clara.** Título → conteúdo principal → ações. O HUD do personagem é a
   âncora; o resto orbita.
4. **Tema único (dark).** Tudo sai dos tokens (§2) — nada de cor/spacing hardcoded.
5. **Sempre ter os 4 estados:** carregando, vazio, erro, conteúdo (§7).

## 2. Design tokens ✅ (já existe — passa a ser regra)
Fonte: `src/theme`. **Nenhum valor literal fora daqui.**
- **Cores:** `primary`(azul), `success`(verde), `hp`(vermelho), `xp`(laranja),
  `skill`(ciano), `gold`(amarelo), `bg`, `surface`, `surfaceAlt`, `border`, `overlay`,
  `textInverse`, `textMuted`. 🆕 add tokens semânticos novos: `essencia`, e um por
  atributo (`forca`/`agilidade`/`vitalidade`/`foco`) e por boss/perigo.
- **Tipografia:** Barlow + Barlow Condensed; variantes `h1`,`h2`,`title`,`label`,
  `bodyMedium`,`bodyMuted`,`stat`,`display`.
- **Espaçamento:** `xs`4 `sm`8 `md`12 `lg`16 `xl`24 `xxl`32.
- **Raio:** `sm`4 `md`8 `lg`12 `pill`999.

## 3. Biblioteca de componentes ✅ (reusar sempre)
Base em `src/components/ui`: `Screen` (wrapper + safe area + refresh), `Card` (com
`accent`), `Button` (primary/outline/destructive), `Input`, `Text` (variantes),
`ProgressBar`, `Segmented`, `Stepper`, `DatePickerField`, `NumericPickerField`,
`ImageUploadPicker`, `MediaThumb`, `Toast`.
- **Regra:** toda tela é composta desses; criar componente novo só quando um padrão se
  repetir 3×+ (aí vira componente, não cópia).
- 🆕 componentes a adicionar para as features novas: `StatBadge`/`AttributeBar` (atributos),
  `EquipmentSlot`, `BossHpBar` (com fases), `ObjectiveRow`, `StoryChapter`.

## 4. Arquétipos de tela (templates padronizados)
Toda tela é **um** destes. 🆕 a regra é: escolher o arquétipo, não improvisar.

| Arquétipo | Quando | Estrutura |
|---|---|---|
| **Lista** | coleção de itens | `Screen` + header (título + "+") + `FlatList` de cards-linha + estado vazio |
| **Detalhe** | um item | header com voltar + conteúdo + ações no rodapé |
| **Formulário** | criar/editar | `ScrollView` + campos (Input/Segmented/pickers) + erro + botão primário (salvar) + secundário (excluir) |
| **Painel** | visão dentro de uma aba | seções em `Card`, sem navegação própria |
| **Modal** | edição rápida / confirmação | overlay + `Card` + X/confirmar |

**Padrões de item de lista** ✅ (HabitRow/SkillRow/SideQuestRow/RewardCard): card com
título + badge + ação inline; estado "não disponível hoje" com opacity reduzida.

## 5. Regra modal vs. tela 🆕 (definitiva — hoje é inconsistente)
- **Modal:** edição rápida de **1–3 campos** ou **confirmação**. Ex.: registrar medida,
  confirmar compra, escolher hábito.
- **Tela cheia:** fluxos com **lista, múltiplos passos ou navegação**. Ex.: builder de
  treino, sessão de treino, formulário de hábito.
- **Edição:** padronizar em **um** modelo — detalhe abre em modo leitura e alterna para
  edição **na mesma tela** (não misturar com modais de edição). 🔄 hoje hábito edita
  inline e metas abrem modal; unificar.

## 6. Navegação
### 6.1 Shell pluggável (registry-driven) 🆕
A barra de abas e os filtros de histórico **enumeram o `module_registry`** ([04 §2](./04-modulos.md)) —
nada de lista hardcoded. Módulo `ativo` aparece; futuro (dieta/finanças/foco) aparece
sozinho ao ser ligado.

### 6.2 Estrutura de navegação 🔄 (retrabalhada)
**Abas inferiores (5):**
1. **Início** — home de verdade: **resumo de tudo** (não é mais a tela de hábitos). §6.2.1.
2. **Hábitos**
3. **Corpo**
4. **Loja**
5. **História/Boss** — a **tela-assinatura** do sistema (§8): posição de destaque (ex.:
   central, com tratamento visual diferenciado).

- **Histórico deixa de ser aba** 🔄 — fica acessível por **botões nas próprias telas**
  (cada módulo mostra seu histórico) + uma entrada para o histórico geral na Início.
- **Acessadas pela Início (não-abas):** Personagem/Build, Skills, Side Quests,
  Conquistas, Config, Histórico geral.

### 6.2.1 O que a Início mostra (resumo de tudo) 🆕
A Início é o painel-resumo, não um módulo:
- **HUD do personagem** no topo (HP/XP/nível/ouro/Essência/streak global) → toque abre
  **Personagem/Build**.
- **Hoje, em todos os módulos:** hábitos pendentes, status do treino, alertas do corpo,
  side quests do dia.
- **Snapshot do boss atual** (HP/fase) → toque abre **História/Boss**.
- **Metas diárias** (XP/ouro) e celebrações recentes.
- **Atalhos:** Conquistas, Skills, Histórico geral, Config.

### 6.3 Correções dos problemas atuais 🔄
- **Abas internas do Corpo:** hoje 7 "abas" onde umas trocam painel e outras navegam pra
  fora — comportamento ambíguo. **Unificar:** todas viram **painéis in-screen**; CRUD
  profundo (criar exercício/divisão) vira **modal**. Sem barra dupla.
- **Portas duplicadas:** Skills e Side Quests têm aba escondida (`href:null`) **e** tela
  full-screen. **Remover a duplicação** — manter só a tela acessada pelo dashboard.
- **"Histórico":** corrigir o typo "Historico" (sem acento) em todos os lugares.
- **Rótulos PT consistentes:** "Treinos/Exercícios/Medidas/Divisões" — padronizar e
  documentar o vocabulário.

## 7. Estados de tela 🆕 (sempre os 4)
- **Carregando:** skeleton/placeholder (não spinner solto no meio).
- **Vazio:** `Card` centralizado com texto + CTA ("criar primeiro hábito").
- **Erro:** mensagem clara + ação de retry; nunca falha silenciosa.
- **Feedback:** `Toast` para sucesso/erro; **modal de celebração** para level-up
  ([02 §3](./02-economia.md)) e **vitória de boss** ([05 §7](./05-temporadas-boss.md)).

## 8. Telas novas
- **Personagem / Build** 🆕 (arquétipo Painel) — HUD vive na **Início**; tela cheia
  acessada por ela. Mostra atributos (Força/Agi/Vit/Foco com origem) + equipamento (3
  slots) + classe. Valor próprio: ver a vida virar ficha ([03](./03-atributos-build.md),
  [07 Fase 4](./07-roadmap.md)).
- **História / Boss — a tela-assinatura** 🆕⭐ — a tela **mais imersiva e diferenciada**
  do app e a **única exceção sancionada** aos arquétipos (§1/§4). Pode usar layout
  full-bleed, atmosfera, arte e animação para criar a sensação de **jornada/batalha**,
  **mantendo-se nos design tokens** (§2) para coesão de marca. Reúne tudo num só lugar:
  - o **arco/história** (capítulos, marcos de dano tecidos no texto, árvore de bosses
    conectados — [09 §5](./09-narrativa-e-ia.md));
  - a **batalha** (`BossHpBar` com fases, `ObjectiveRow` dos objetivos cross-module,
    fraqueza revelada por Foco, contra-ataque/meta diária — [05](./05-temporadas-boss.md)).
  É o coração emocional do sistema — onde o esforço da vida vira épico. Merece o maior
  investimento de design.

## 9. Acessibilidade e responsividade (mínimos) 🆕
- Alvos de toque ≥ 44pt; contraste suficiente no tema dark; respeitar safe areas
  (`Screen` já cobre); textos escaláveis (sem tamanho fixo em px cru fora dos tokens).

## 10. Decisões fechadas
1. ✔ **Abas inferiores (5):** Início (resumo de tudo) · Hábitos · Corpo · Loja ·
   **História/Boss** (tela-assinatura, posição de destaque).
2. ✔ **Histórico** não é mais aba — botões nas telas + entrada na Início.
3. ✔ **Início** vira home-resumo real (§6.2.1); **Personagem/Build** = HUD na Início +
   tela cheia por ela.
4. ✔ **História/Boss** = a tela mais incrível/diferenciada (exceção sancionada, §8).
5. ✔ **Vocabulário PT** fixado no glossário (§11).

## 11. Glossário de vocabulário PT 🆕 (fonte única dos rótulos de UI)
Um rótulo por conceito — usar **exatamente** estes na UI; não criar sinônimos por tela.

| Conceito (tabela) | Rótulo singular | Rótulo plural | Notas |
|---|---|---|---|
| `workout_sessions` (execução) | **Treino** | **Treinos** | a sessão executada/registrada |
| `workout_templates` (plano) | **Modelo** | **Modelos** | "Modelo de treino"; o plano reutilizável |
| `fitness_exercises` | **Exercício** | **Exercícios** | o movimento em si |
| `body_parts` | **Divisão** | **Divisões** | grupo muscular (ex.: Peito, Costas) |
| `body_measurements` | **Medida** | **Medidas** | registro corporal do dia |
| `body_goals` | **Meta** | **Metas** | "Meta do corpo" |
| `skills` | **Skill** | **Skills** | mantém o anglicismo já consagrado no app |
| `side_quests` | **Missão** | **Missões** | bate com o `module_registry.nome` |
| `habits` | **Hábito** | **Hábitos** | |
| `economy_events` (tela) | **Histórico** | — | sempre com acento |
| `rewards` | **Recompensa** | **Recompensas** | |
| moeda boss | **Essência** | — | |
| streak global | **Sequência** | — | rótulo PT do "streak" de personagem no HUD |

Regra: telas e filtros que enumeram o `module_registry` usam a coluna `nome` como rótulo
(já em PT) — o glossário acima é a referência para tudo que **não** vem do registry.
