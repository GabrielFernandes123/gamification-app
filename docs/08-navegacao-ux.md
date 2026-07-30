# 08 — UI/UX: Design System, Padrões de Tela e Navegação

> **Dono de:** o design system (tokens, componentes), os arquétipos de tela e suas
> regras de padronização, a navegação pluggável e a cura dos problemas atuais, e onde as
> telas novas se encaixam. Módulos/registry → [04](./04-modulos.md). Telas novas
> (personagem, boss, história) referenciam [03](./03-atributos-build.md)/[05](./05-temporadas-boss.md)/[09](./09-narrativa-e-ia.md).
> Estado: 📋 padrão a consolidar. Legenda: ✅ já existe · 🆕 padrão novo · 🔄 correção.

---

## 0. A régua: **o app é registro em movimento** 🔄 (2026-07-30)
> Antes de qualquer coisa nesta página: **o celular só carrega o que se faz longe do
> computador.** Consulta, análise, configuração e gestão vivem no web.
>
> A razão é o uso real: o dono do sistema passa a maior parte do dia na frente do PC,
> onde o web e os widgets do Electron já estão abertos. Duplicar cada tela no celular
> custava manutenção em dois lugares e deixava o app pesado justamente para as três
> coisas que só ele consegue fazer — academia, mesa e cama.
>
> **Fica no app:** marcar hábito · executar treino · registrar medida · registrar
> refeição (voz) · diário (foto/áudio) · plano do dia · trégua · sono (HealthKit).
> **Vai para o web:** História/Boss · Loja · Personagem · Stats · Conquistas · Skills ·
> Missões · Histórico · Tempo de tela · builder de treino · catálogo de exercícios ·
> metas · preferências de notificação.
>
> Consequência prática: o app encolheu de ~14.200 para ~5.500 linhas de rota, e o
> `ModuleLauncher` passa a **abrir o web** (`EXPO_PUBLIC_WEB_URL`) para toda chave do
> registry sem tela própria no celular.

### 0.1 O corolário: **todo módulo do app precisa de par no web** 🆕 (2026-08-01)
> A régua do §0 só é verdade se o outro lado existir. Se o celular apenas registra,
> **consultar, configurar e corrigir têm de existir no web** — senão não existem em
> lugar nenhum.
>
> Isto virou regra depois de a leva de 2026-08-01 quase fechar sem ela: Diário, Nutrição
> e Plano nasceram com API e app, e sem tela de consulta no PC. O `ModuleLauncher` já
> apontava para `/nutrition` e `/journal`, que **não existiam** — teria caído no
> `NotFoundPage`.
>
> **Checklist para todo módulo novo:**
> 1. tabelas + `_grant` + linha no `module_registry` ([04 §1](./04-modulos.md))
> 2. superfície de REGISTRO onde o registro acontece (o app, se for longe do PC)
> 3. superfície de CONSULTA e CONFIGURAÇÃO no web
> 4. rota no `gamificacao-web/src/App.tsx` batendo com o destino do `ModuleLauncher`
>
> Pares atuais: Nutrição → `/nutrition` · Diário → `/journal` · Plano/trégua → `/plan` ·
> Sonhos → `/bucket` · Pessoas → `/relationships` · Trabalho → `/work` ·
> Cicatrizes e limite de WIP → `/character` (aba **Marcas**) · Régua de esforço →
> `/store` · Reputação → `/stats` · Notificações e retrospectiva → Configurações e
> História.

### 0.2 A segunda metade da regra: **mecânica que muda número precisa aparecer** 🆕 (2026-08-04)
> O §0.1 cobre módulo com tela. A varredura de 2026-08-04 achou o buraco vizinho:
> **mecânica transversal**, que não é módulo e não tem rota própria, mas mexe no que
> você ganha.
>
> A **ferrugem de skill** (⑨) era o caso: a maestria caía de 1,0 até 0 ao longo de
> 56 dias parados, e **nenhuma tela dizia isso**. Do lado de dentro é uma curva
> documentada; do lado de fora é o mesmo hábito rendendo menos sem explicação — que é
> indistinguível de um bug, e corrói a confiança no sistema inteiro.
>
> **A regra:** se uma mecânica multiplica XP, ouro ou dano, ela precisa de um lugar
> onde o usuário **veja o estado e entenda a saída**. Não precisa de tela própria — um
> selo serve. Precisa existir.
>
> E o número mostrado tem de vir **calculado do servidor, da mesma fonte que aplica o
> efeito**. `GET /skills` devolve `rust_state` e `mastery_factor` de `economy/rust.ts`,
> o mesmo módulo que o `_grant` chama. A tela não recalcula curva nenhuma: duas
> implementações da mesma fórmula divergem, e aí o número exibido vira mentira.
>
> Onde cada uma aparece hoje: ferrugem → selo em `/skills` · nêmese e bônus de retorno →
> `/stats` · cicatrizes e WIP → `/character` (aba Marcas) · preço em esforço → `/store` ·
> orçamento de trégua → `/plan`, **antes** de abrir (não na mensagem de erro).

### 0.3 Fechar o passado antes de abrir o dia 🆕 (2026-08-04)
> O fechamento automático é autônomo de propósito — se dependesse de você abrir
> o app, o sistema pararia. Mas ele decide por você, e às vezes decide errado:
> você fez o hábito e esqueceu de marcar.
>
> **Punir uma omissão de interface é o pior tipo de falso sinal.** Não ensina
> disciplina; ensina que os números não são confiáveis, e a partir daí o resto
> da gamificação perde efeito.
>
> O card **"Ontem fechou sozinho"** abre a Início (e o Dashboard do web), acima
> do plano do dia. Três decisões de desenho:
>
> 1. **Card, não modal.** Um pop-up bloqueante listando o que você falhou é
>    ritual de punição logo cedo. O card some sozinho quando não há nada a
>    corrigir, que é a maioria dos dias.
> 2. **Um ritual matinal, não dois.** Fica colado no `PlanCard`: o passado
>    fecha e o dia abre no mesmo gesto, em vez de dois cards disputando o mesmo
>    momento.
> 3. **Aceita "eu recaí", não só "eu fiz".** Se só apagasse consequência, seria
>    um botão de desfazer dano — e corroeria justamente a confiança que veio
>    consertar.
>
> **O que separa esquecimento de decisão:** só entra o log que o CRON escreveu,
> e ele se identifica sozinho — roda no dia seguinte, então `created_at` cai
> depois de `occurred_on`. O que você fechou à mão não é corrigível.
> Janela: até o fim do dia seguinte.

## 1. Princípios de UI/UX
1. **Consistência > criatividade por tela.** A mesma ação se faz do mesmo jeito em todo
   módulo. Tela nova reusa arquétipo existente (§4), não inventa layout. **Exceção
   sancionada:** a tela-assinatura **História/Boss** (§8) pode quebrar os arquétipos por
   imersão — desde que fique dentro dos design tokens (§2). Ela agora mora **no web**.
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

### 6.2 Estrutura de navegação 🔄 (2026-07-30 — de 5 abas para 4)
**Abas inferiores (4):**

| Aba | O que faz | Por que fica no celular |
|---|---|---|
| **Início** | HUD · o dia · snapshot do boss + oráculo · **plano do dia / trégua** · ação rápida de refeição | é o resumo que se olha no meio do dia |
| **Hábitos** | lista + marcar/desfazer | o registro mais frequente |
| **Corpo** | executar treino · medidas · **nutrição** | academia e mesa, longe do PC |
| **Diário** | humor · foto do caderno · áudio · texto | registro do dia, feito onde você está |

Mais **Configurações** enxuta (perfil, fuso, escudo do iOS, sair) e as telas de execução
em full-screen que já existem (`body/workouts/[id]`).

- **História/Boss deixou de ser aba** 🔄 — a tela-assinatura mora no **web**. No celular
  sobra o **snapshot** na Início (HP, dias restantes, oráculo). Ela era a maior rota do
  app (3.209 linhas) e é de leitura/imersão, não de registro — exatamente o oposto da
  régua do §0.
- **Loja, Personagem, Stats, Conquistas, Skills, Missões, Histórico, Tempo de tela** —
  todos no web, alcançáveis pelo `ModuleLauncher` (§6.1), que abre o navegador.
- ⚠️ **Remover ROTAS, preservar FEATURES.** `features/store`, `features/season` e
  `features/character` continuam no app porque coisas que ficaram dependem delas — o
  `CharacterHud` usa `useActiveBuffs`, `HabitRow` usa a loja, o dashboard usa a
  temporada. Podar por intuição aqui quebra o HUD; poda só o que o `tsc` provar órfão.

### 6.2.1 O que a Início mostra (resumo de tudo) 🔄
A Início é o painel-resumo, não um módulo:
- **HUD do personagem** no topo (HP/XP/nível/ouro/Essência/streak global) → toque abre
  **Personagem no web**.
- **Plano do dia / trégua** 🆕 — quantos hábitos você declara para hoje, ou o cartão de
  trégua ativa ([14 §5.2⑦](./14-backlog-modulos-e-mecanicas.md) e [§5.3⑩](./14-backlog-modulos-e-mecanicas.md)).
- **Ação rápida de refeição por voz** 🆕 — é a ação mais frequente do dia depois de
  hábitos; enterrá-la em Corpo › Comida custaria três toques para algo que se faz três
  vezes por dia.
- **Hoje, em todos os módulos:** hábitos pendentes, status do treino, alertas do corpo.
- **Snapshot do boss atual** (HP/dias/oráculo) → toque abre **História no web**.
- **Cicatriz pendente** 🆕 — quando uma morte deixou uma escolha em aberto. Vem antes
  de tudo: é a única coisa da tela esperando uma decisão, e o momento em que ela
  importa é logo depois de acontecer ([14 §5.4⑫](./14-backlog-modulos-e-mecanicas.md)).
- **Quem está esfriando** 🆕 — até 3 pessoas e um botão de "falei". Ligar para alguém
  acontece no carro, na fila, longe do PC; se exigisse abrir o computador viraria
  "depois eu anoto", e o módulo é 90% lembrete.
- **Metas diárias** (XP/ouro) e celebrações recentes.

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
- **História / Boss — a tela-assinatura** 🆕⭐ **(no web, desde 2026-07-30)** — a tela
  **mais imersiva e diferenciada** e a **única exceção sancionada** aos arquétipos
  (§1/§4). Saiu do celular porque é leitura e contemplação, não registro em movimento
  (§0) — e porque a tela grande é onde arte, capítulos e árvore de bosses cabem de
  verdade. No app fica só o snapshot na Início. Pode usar layout
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
1. ✔ **O app é registro em movimento** (§0). Consulta, análise e gestão vão para o web.
   *(2026-07-30 — substitui as decisões 1 e 4 anteriores.)*
2. ✔ **Abas inferiores (4):** Início · Hábitos · Corpo · Diário.
3. ✔ **Histórico** não é aba nem tela do app — vive no web.
4. ✔ **História/Boss** = a tela mais incrível/diferenciada (exceção sancionada, §8),
   **no web**; no celular só o snapshot na Início.
5. ✔ **Início** é home-resumo real (§6.2.1), agora com plano do dia e refeição por voz.
6. ✔ **Vocabulário PT** fixado no glossário (§11).

### 10.1 Histórico da decisão
Até 2026-07-30 o app tinha **5 abas** (Início · Hábitos · Corpo · Loja · História/Boss) e
espelhava quase todo o web. A mudança não foi de gosto: era manutenção dupla de telas que
o dono abria no PC de qualquer jeito. O que se ganhou foi espaço para o que só o celular
faz — HealthKit, microfone e câmera —, tudo entrando na mesma build.

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
