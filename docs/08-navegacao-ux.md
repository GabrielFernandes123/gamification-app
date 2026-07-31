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

### 0.0 A segunda passada: a régua entrou nas telas 🔄 (2026-07-31)
> O corte de 2026-07-30 tirou **rotas** e parou aí. Os painéis de leitura e de
> configuração continuaram morando **dentro** das quatro telas que sobraram: o Corpo
> ainda tinha um builder de metas e um gráfico de evolução, a Início ainda era um
> console de nove queries, e Configurações ainda era a cópia inteira da tela do web.
>
> Nesta passada saíram: **Configurações** (nome, fuso, metas do dia, modo de morte,
> avisos do corpo, hábitos inativos, zerar progresso) · **Metas do corpo** (CRUD) ·
> **gráfico de medidas** · **Resumo do corpo** (semana, PRs, avisos) · **ficha da
> divisão corporal** · **quadro de missões**, **radar da base**, **metas diárias**,
> **tiles de loja/missões** e a **faixa do boss** na Início.
>
> `src/app` foi de **6.000 para 3.661 linhas** (−39%), e a Início abre com 2 queries
> em vez de 9. Nenhuma capacidade sumiu: cada item acima já tinha par no web (§0.1).
>
> A única configuração que ficou é a de **permissões** — porque é do sistema
> operacional, e o navegador não alcança.

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
| **Início** | HUD · cicatriz · ontem · **plano do dia / trégua** · pessoas · refeição por voz | as decisões que só podem ser tomadas agora |
| **Hábitos** | lista + marcar/desfazer | o registro mais frequente |
| **Corpo** | executar treino · medidas · **nutrição** | academia e mesa, longe do PC |
| **Diário** | humor · foto do caderno · áudio · texto | registro do dia, feito onde você está |

Mais **Ajustes** (permissões do iOS, escudo do iPhone, sair) e as telas de execução
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

### 6.2.1 O que a Início mostra 🔄 (2026-07-31 — de resumo para decisões)
A Início **deixou de ser painel-resumo**. O teste de entrada passou a ser um só: *é uma
decisão que só pode ser tomada agora, longe do computador?* Quem não passa, saiu — e
com ela foram o quadro de missões, o radar da base, as metas diárias, os tiles de
loja/missões e a **faixa do boss**.

O boss é a mudança que contraria a decisão anterior desta mesma seção, e por isso vale
o registro: a faixa era o resto de uma tela de contemplação que já tinha ido para o web
([§8](#8-telas-novas)). Olhar o HP do boss não é decidir nada — e o `/historia`, no PC,
está aberto o dia inteiro. Ela custava a query mais cara da tela.

- **HUD do personagem** no topo (HP/XP/nível/ouro/Essência/streak global) → toque abre
  **Personagem no web**. Fica porque é o **retorno do que você registrou**, não
  estatística ([§0.2](#02-a-segunda-metade-da-regra-mecânica-que-muda-número-precisa-aparecer)).
- **Plano do dia / trégua** 🆕 — quantos hábitos você declara para hoje, ou o cartão de
  trégua ativa ([14 §5.2⑦](./14-backlog-modulos-e-mecanicas.md) e [§5.3⑩](./14-backlog-modulos-e-mecanicas.md)).
- **Ação rápida de refeição por voz** 🆕 — é a ação mais frequente do dia depois de
  hábitos; enterrá-la em Corpo › Comida custaria três toques para algo que se faz três
  vezes por dia.
- **Ontem fechou sozinho** — o card de correção do fechamento automático (§0.3).
- **Cicatriz pendente** 🆕 — quando uma morte deixou uma escolha em aberto. Vem antes
  de tudo: é a única coisa da tela esperando uma decisão, e o momento em que ela
  importa é logo depois de acontecer ([14 §5.4⑫](./14-backlog-modulos-e-mecanicas.md)).
- **Quem está esfriando** 🆕 — até 3 pessoas e um botão de "falei". Ligar para alguém
  acontece no carro, na fila, longe do PC; se exigisse abrir o computador viraria
  "depois eu anoto", e o módulo é 90% lembrete.
- **`ModuleLauncher`** — a porta única para tudo que vive no web (§6.1).

### 6.2.2 O widget não mora mais na tela 🆕 (2026-07-31)
O snapshot do widget do iPhone era montado **dentro da Início**, a partir das nove
queries dela. Isso acoplava um artefato do sistema operacional a uma tela — e a tela
acabou de perder as queries.

Agora ele vem de **`GET /today`** (agregado novo na API) e é publicado por
`useTodayJourneySync`, montado no **layout das abas**. Duas consequências boas: o widget
atualiza mesmo para quem abre o app direto em Hábitos, e a contagem do dia passa a vir
do servidor — a mesma fonte que paga o XP (§0.2). No app fica só o **texto** dos
rótulos, que é apresentação.

### 6.3 Correções dos problemas atuais 🔄
- ✔ **Abas internas do Corpo:** resolvido em 2026-07-31 — sobraram três painéis
  in-screen (Treinos · Medidas · Comida) e **um** ícone no header que abre `/body` no
  web. Antes eram 5 abas e 3 ícones com destinos diferentes.
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
  verdade. **No app não ficou nada** — nem o snapshot (§6.2.1, 2026-07-31). Pode usar layout
  full-bleed, atmosfera, arte e animação para criar a sensação de **jornada/batalha**,
  **mantendo-se nos design tokens** (§2) para coesão de marca. Reúne tudo num só lugar:
  - o **arco/história** (capítulos, marcos de dano tecidos no texto, árvore de bosses
    conectados — [09 §5](./09-narrativa-e-ia.md));
  - a **batalha** (`BossHpBar` com fases, `ObjectiveRow` dos objetivos cross-module,
    fraqueza revelada por Foco, contra-ataque/meta diária — [05](./05-temporadas-boss.md)).
  É o coração emocional do sistema — onde o esforço da vida vira épico. Merece o maior
  investimento de design.

## 8.1 O mapa de rotas do web ✅ 🆕 (2026-08-06)

Estava documentado só o `GET /today`. O web tem **39 rotas** — 32 dentro do shell
e 7 fora, mais o catch-all — e sem elas escritas não dá para responder "onde fica
X" sem abrir o `App.tsx`.

| Seção | Rotas |
|---|---|
| **Decidir** | `/` (Início) · `/plan` · `/chat` · `/historia` |
| **Registrar** | `/habits` · `/sidequests` · `/body` (+ `/exercises`, `/parts`, `/templates`, `/treinos/:id`, `/workouts/:id`, `/settings`) · `/nutrition` · `/sono` · `/leitura` · `/journal` · `/work` |
| **Acompanhar** | `/stats` · `/history` · `/objectives` · `/codex` · `/achievements` · `/skills` · `/character` · `/tracking` · `/bucket` · `/relationships` · `/store` · `/wiki` · `/settings` |
| **Fora do shell** | `/widget` · `/hud` · `/focus` · `/blocked` · `/login` · `/signup` · `/auth/handoff` |

- **`/sono`** ✅ (2026-08-05) — a tela que faltava. O sono era registrado e não
  tinha onde ser LIDO; listagem, histórico e metas moravam espalhados. Um módulo
  que só escreve não vira estatística (§0.2).
- **As quatro últimas não usam o shell** de propósito: `/widget`, `/hud` e
  `/focus` são janelas do Electron, e `/blocked` é a tela de bloqueio do tracking
  — todas precisam de moldura própria.

### 8.1.1 O que mudou em 2026-08-06
- **Estatísticas ganhou 6 abas** — Plano, Sono, Nutrição, Leitura, Trabalho e
  Pessoas. Elas **somem quando o módulo está desligado** ([04 §2.1](./04-modulos.md)),
  e é isso que resolve a sensação de vazio: os painéis existem prontos, e quem
  não usa o módulo não vê a aba em vez de encontrar um gráfico zerado.
  - A ordem é intencional: o que é do **jogo** (Geral, Economia, Combate,
    Temporada) nunca some; o que é de **registro** aparece conforme você liga.
  - Desligar o módulo estando na aba dele cai para a Visão geral — sem essa
    guarda a tela ficaria em branco, sem erro nenhum.
- **Nutrição ganhou a aba Receitas**, ao lado do dia e não junto de metas e
  slots: receita é **catálogo pessoal**, não configuração. Quem abre ali vem
  registrar.
- **Ajustes ganhou o painel Módulos** — o liga-desliga, com o texto dizendo a
  consequência em vez de confiar na cor de um botão.

### 8.1.2 Estatísticas — a arquitetura e a questão de agrupamento em aberto

> Migrado de `análise de estatísticas de 2026-07-30` §5–§6 em **2026-08-06**, ao descartar os
> docs da raiz (não eram versionados). Atualizado: metade já foi resolvida.

**✅ Resolvido — uma rota por recorte.** `/stats/overview` rodava ~20 queries
agregadas e devolvia o payload inteiro, mesmo para quem abrisse só a Visão geral.
Hoje são **14 rotas** (`/stats/economy`, `/stats/habits`, `/stats/sleep`…) e o
front usa `useQuery({ enabled: tab === '<recorte>' })`.

A regra que sobra dessa decisão, para o próximo painel: **quebre no mesmo commit
do primeiro painel novo, nunca antes nem depois.** Antes é refatorar sem entregar;
depois é refatorar 13 painéis.

**❓ Em aberto — agrupar por DOMÍNIO DA VIDA ou por módulo do software?**

Hoje as abas são por módulo (Hábitos, Treino, Sono, Nutrição, Leitura…). A
alternativa avaliada agrupa por domínio:

| Aba | Conteúdo |
|---|---|
| Corpo | treino + cardio + medidas + **sono** + **nutrição** |
| Vida | **leitura** + **trabalho** + **relacionamentos** + diário |
| Economia | economia + preço que respira + cicatrizes + sonhos |
| Combate & Temporada | dano recebido + **dano causado** + tiers + dungeons |

**O argumento a favor:** agrupamento por domínio da vida envelhece melhor — é o
que permite o próximo módulo entrar sem virar a 12ª aba.

**Por que NÃO foi feito agora:** a análise original recomendava adiar porque as
abas nasceriam vazias, e *"aba vazia ensina o usuário a não clicar"*. Esse
argumento **caiu** com o liga-desliga ([04 §2.1](./04-modulos.md)) — aba de
módulo desligado não existe, então não há vazio a ensinar.

O que sobra é uma questão de **preferência com consequência real**: por módulo é
previsível (você sabe onde procurar); por domínio é mais enxuto e sobrevive a mais
módulos. Reavaliar quando 3–4 dos módulos novos tiverem histórico de verdade — a
decisão fica muito mais fácil olhando painéis com dado.

### 8.2 A régua aplicada à nutrição 🆕 (2026-08-06)
Um exemplo de como o §0 decide, na prática, onde cada peça mora:

| Peça | Onde | Por quê |
|---|---|---|
| Registrar refeição (voz, manual) | **app** e web | registro em movimento |
| **Água** (+200/+300/+500) | **app** (Início) e web | é o registro que mais acontece fora de casa |
| Aprovar a fila da IA | **web** primeiro | é conferência, e a tela grande mostra o item ao lado do catálogo |
| Editar metas, slots, alimento próprio | **web** | configuração; mexe-se uma vez |
| **Calculadora de TDEE** | **só web** | configuração pura, com seis campos — não é coisa de fila de supermercado |
| **Criar** receita | **só web** | montar item a item é configuração |
| **Registrar** receita | **app** e web | um toque, com o shake na mão — no app some quando não há nenhuma salva, porque bloco inútil na Início custa atenção todo dia |
| Foto do rótulo | **web** | o cadastro do alimento já mora lá; a foto só preenche os campos |

## 9. Acessibilidade e responsividade (mínimos) 🆕
- Alvos de toque ≥ 44pt; contraste suficiente no tema dark; respeitar safe areas
  (`Screen` já cobre); textos escaláveis (sem tamanho fixo em px cru fora dos tokens).

## 10. Decisões fechadas
1. ✔ **O app é registro em movimento** (§0). Consulta, análise e gestão vão para o web.
   *(2026-07-30 — substitui as decisões 1 e 4 anteriores.)*
2. ✔ **Abas inferiores (4):** Início · Hábitos · Corpo · Diário.
3. ✔ **Histórico** não é aba nem tela do app — vive no web.
4. ✔ **História/Boss** = a tela mais incrível/diferenciada (exceção sancionada, §8),
   **no web**; no celular, **nada** — nem o snapshot. *(2026-07-31, §6.2.1.)*
5. ✔ **Início** é a tela das decisões do dia, não um resumo (§6.2.1). *(2026-07-31 —
   substitui a decisão anterior, que a definia como home-resumo.)*
6. ✔ **A única configuração do app é permissão** (§0.0). Perfil, fuso, metas, modo de
   morte e avisos vivem no web. *(2026-07-31.)*
7. ✔ **Corpo tem três painéis:** Treinos · Medidas · Comida. Metas, gráficos, divisões e
   exercícios são web. *(2026-07-31.)*
8. ✔ **O widget vem de `GET /today`**, montado no layout das abas (§6.2.2). *(2026-07-31.)*
9. ✔ **Vocabulário PT** fixado no glossário (§11).

### 10.1 Histórico da decisão
Até 2026-07-30 o app tinha **5 abas** (Início · Hábitos · Corpo · Loja · História/Boss) e
espelhava quase todo o web. A mudança não foi de gosto: era manutenção dupla de telas que
o dono abria no PC de qualquer jeito. O que se ganhou foi espaço para o que só o celular
faz — HealthKit, microfone e câmera —, tudo entrando na mesma build.

Em **2026-07-31** veio a segunda passada (§0.0). A de 2026-07-30 tinha tirado rotas; esta
entrou nas telas que ficaram, onde a leitura e a configuração continuavam escondidas
dentro de abas internas. Duas decisões foram **revertidas** em vez de estendidas:

- a **faixa do boss na Início** (decisão 4 anterior) — mantê-la fazia sentido enquanto a
  Início era resumo; deixou de fazer quando ela virou a tela das decisões;
- a **Início como home-resumo** (decisão 5 anterior) — o resumo é justamente o que o web
  e os widgets do Electron entregam melhor, no monitor que fica aberto o dia todo.

Junto foi o `openWeb`: como o corte transformou esse helper no único caminho para tudo
que saiu, ele passou a **carregar a sessão** para o Safari (fragment + `/auth/handoff` no
web). Sem isso, cada link teria terminado numa tela de login.

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
