# 04 — Módulos e o Contrato de Módulo

> **Dono de:** o contrato que todo módulo cumpre, o `module_registry`, e a ficha de
> cada módulo (o que recompensa, qual `source_type`, o que alimenta). Fórmulas →
> [02](./02-economia.md). Build/atributos → [03](./03-atributos-build.md). Boss →
> [05](./05-temporadas-boss.md). Dados → [06](./06-dados.md). Estado: ✅ implementado — **22 chaves** no `module_registry`, **16 ativas** (conferido em 2026-08-06). Cada uma pode ser desligada por usuário (§2.1).
> Legenda: ✅ existe hoje · 🆕 projetado.

---

## 1. O contrato de módulo

Para um módulo existir no sistema, ele cumpre **três coisas — e só**:

1. **Tabelas de domínio próprias** (o que aquele módulo registra).
2. **Chamar o núcleo `_grant`** ao concluir uma atividade, com seu `source_type`
   (ver [01 §4](./01-arquitetura.md) e [02 §9](./02-economia.md)).
3. **Registrar-se no `module_registry`**.

Em troca, **ganha de graça** (sem código por módulo): histórico unificado, conquistas,
elegibilidade para objetivos de boss, e presença no shell (navegação + filtros leem o
registry — ver [08](./08-navegacao-ux.md)).

> **Princípio que simplifica tudo:** vários "módulos novos" são, na verdade, o **motor
> de hábitos especializado** + uma visão de domínio. Reusar o motor de hábitos (que já
> tem proporcionalidade, streak, dano, fechamento) evita reimplementar lógica e mantém
> a coerência. Só viram lógica nova as partes genuinamente diferentes.

## 2. `module_registry` (a tabela que torna tudo plugável)

Uma linha por módulo. O shell e os filtros de histórico **enumeram esta tabela** — não
há lista hardcoded em lugar nenhum.

Campos conceituais (modelo em [06](./06-dados.md)): `key` (= `source_type`), `nome`,
`icone`, `cor`, `ordem`, `ativo`, `kind` (`atividade` | `meta`).

## 2.1 Liga-desliga de módulos ✅ 🆕 (2026-08-06)

Todo módulo de atividade pode ser **desligado por usuário**. É temporário e
**não apaga nada**: o dado registrado continua no banco e reaparece ao religar.

| Enquanto desligado | |
|---|---|
| Some das telas | é isso que impede registrar — não há trava dura na rota |
| Não paga XP nem ouro | gate no `_grant` |
| Não causa dano | gate no `DamageService` |
| Não fecha período | os 5 crons pulam |
| Não vira objetivo de boss nem capítulo | registry + digest do narrador |

**Por que existe.** Um sistema com quinze módulos cobra quinze coisas de quem
usa, e quem não quer Leitura ainda via a tela, o objetivo de boss e o painel
vazio de estatística. Desligar é a diferença entre "ainda não comecei isso" e
"isto está me cobrando todo dia".

Schema e o alerta sobre `ativo` × `habilitado` em
[06 §9.15](./06-dados.md). Sem trava dura na rota **por decisão**: sumir a tela
já resolve, e um 403 obrigaria todo cliente a tratar um erro que não é erro.

## 3. Tipos de atividade (o que define dano/streak)

Para manter coerência, todo módulo de atividade é de **um de dois tipos**:

- **Tipo-hábito** (positivo/negativo, com **streak** e **dano** no fechamento): reusa
  o motor de hábitos. Ex.: Hábitos, Dieta.
- **Tipo-evento** (pontual, **só recompensa**, sem dano): conclusão dá XP/ouro e acabou.
  Ex.: Treino, Side Quests, Metas, Finanças, Foco, Medidas.

> Dano/morte são pressão de **hábito**. Módulos tipo-evento são positivos — a pressão
> de tempo deles vem dos **objetivos de boss** (ver [05](./05-temporadas-boss.md)),
> não de dano direto.

## 4. Ficha dos módulos

Cada ficha: o que recompensa · `source_type` · base de dificuldade · o que alimenta
(além do personagem, que é sempre) · tipo.

### 4.1 Hábitos ✅🔄 (tipo-hábito)
- **Recompensa:** dia **completo** (positivo) / dia **resistido** (negativo) — modelo de
  dois níveis (meta diária + meta de período em dias), com overshoot ao passar da meta.
- **`source_type`:** `habit`.
- **Base:** dificuldade do hábito, **valor cheio por dia que conta** + overshoot
  (ver [02 §5.1](./02-economia.md)).
- **Alimenta:** skill primária (100%) + secundária (50%) → e portanto os atributos
  mapeados ([03](./03-atributos-build.md)).
- **Streak / dano:** sim / sim. O streak é diário mesmo nos flexíveis; fechamento de
  período só carimba a avaliação semanal/mensal.

### 4.2 Skills ✅ (entidade transversal, não é "atividade")
- Não chama `_grant` por si; **recebe** XP de outros módulos.
- Cada skill aponta para **1 atributo** ([03 §3](./03-atributos-build.md)).
- CRUD próprio; XP e nível próprios.

### 4.3 Treino ✅ (tipo-evento)
- **Recompensa:** finalizar a sessão.
- **`source_type`:** `workout`.
- **Base:** 🆕 ancorada na **dificuldade** (não mais fórmula crua de volume). A sessão
  é classificada numa dificuldade (por intensidade/volume ou escolha), e o volume
  **modula ±20%**. Mapeamento exato sessão→dificuldade: definir no detalhe do módulo.
- **Alimenta:** skill do exercício (100%) + **partes do corpo** primária (100%) /
  secundária (50%) → atributos.
- **Streak / dano:** não / não.

### 4.4 Corpo ✅ (agrupa 3 sub-coisas)
- **Partes do corpo** ✅: entidade transversal (como skills) — XP/nível próprios,
  aponta para 1 atributo, alimentada pelo treino.
- **Medidas** ✅: registrar uma medida dá um XP **trivial** via `_grant`
  (`source_type: body_measurement`, só na 1ª medida de cada dia) — gamifica o diário e
  vira objetivo de boss ("registre N medidas"). Tipo-evento.
- **Metas corporais** ✅: concluir meta dá recompensa **ancorada na tabela de
  dificuldade** (02 §4 — não inventa escala própria), com override opcional por meta
  (`reward_xp`/`reward_gold`). `source_type: body_goal`. Tipo-evento; é módulo de
  atividade (`kind: atividade`) → elegível a objetivo de boss. Alimenta a **parte do
  corpo vinculada** (100%) quando houver. `deadline` ✅ implementado: meta vencida é
  arquivada (cron horário) — sem dano, a consequência é perder a janela.

### 4.5 Side Quests ✅ (tipo-evento)
- **Recompensa:** concluir a missão (valor cheio da dificuldade, **sem** streak).
- **`source_type`:** `sidequest`.
- **Alimenta:** skill primária (100%) + secundária (50%).
- 🆕 side quest vencida (prazo perdido) com consequência (perde/reduz valor).

### 4.9 Sono ✅ (tipo-evento) — implementado em 2026-07-30
- **Recompensa:** uma noite avaliada. **Três critérios independentes**, cada um
  ligável/desligável: deitar até HH:MM, acordar até HH:MM, dormir ao menos N minutos.
  O valor é a **fração dos critérios ativos cumpridos** sobre a base da
  `difficulty_levels` (02 §4) — nunca sobre horas.
- **`source_type`:** `sleep`. `kind: atividade` → entra nos filtros do Histórico
  e é elegível a objetivo de boss.
- **Alimenta:** parte do corpo mapeada em **Vitalidade**, quando houver.
- **Streak / dano:** não / **não**.

> **Por que sem dano, e por que a meta é a hora de DEITAR:** você controla quando
> vai para a cama; não controla se pega no sono. Uma meta de "≥7h" com dano pune
> insônia — castiga justamente na semana em que dormir já está difícil. Critério
> não cumprido reduz a recompensa e para aí. Duração continua sendo registrada
> como acompanhamento.

- **Fonte:** HealthKit (leitura), sincronizado quando o app abre; `POST /sleep/manual`
  cobre a noite sem relógio. Toda importação deduplica por `external_id`, e há
  ainda um `unique (user_id, night_on)` — o relógio devolve a noite em pedaços.
- **`night_on`:** data local do **início** do sono, menos um dia quando se deitou
  antes do meio-dia (deitar 00:30 pertence à noite anterior). O `occurred_on` do
  ledger é o dia de **acordar** — o dia que o sono beneficia.
- **Tela própria** ✅ (2026-08-05) — `/sono` no web ([08](./08-navegacao-ux.md)).
  O sono vinha sendo registrado sem ter onde ser LIDO: a listagem, o histórico e
  a configuração das metas moravam espalhados, e um módulo que só escreve não
  vira estatística.
- **`targets`, `score` e `tz` no log** ✅ (2026-08-05) — a régua do
  [06 §0](./06-dados.md): a noite guarda a meta que a julgou e o fuso em que "a
  noite de 4" foi definida. Sem isso, mudar o horário-alvo hoje reescreveria a
  avaliação de março, e uma viagem faria a mesma noite mudar de dia.

### 4.10 Encontros diários ✅ (camada meta, `kind: meta`)
- Um encontro por dia com **duas opções**, gerado na primeira leitura do dia.
- **`source_type`:** `event`. Não é módulo de atividade: não entra nos filtros
  nem vira objetivo de boss. A linha no registry existe para dar identidade
  visual à linha do Histórico.
- **A IA escolhe tema e texto; o núcleo escolhe os números** (mesma divisão do
  boss — ver [05](./05-temporadas-boss.md)). Efeitos e tetos em [02](./02-economia.md).

### 4.11 Cardio ✅ (tipo-evento) — implementado em 2026-07-31
- **Não é módulo paralelo:** é uma **modalidade da sessão de treino**
  (`workout_sessions.modality` = `forca | cardio`), herdada do modelo. Sessão
  mista vira duas sessões — que é como se registra na vida real.
- **Recompensa:** `score = minutos × intensidade` (força continua
  `séries × 8 + volume/600`). Os dois ramos desembocam na MESMA
  `classifyWorkout` e na mesma `difficulty_levels` — cardio não inventa
  escala própria. Fórmula em [02 §5.6](./02-economia.md).
- **`source_type`:** `cardio` (a modalidade decide a fonte) → filtro no
  Histórico e objetivo de boss próprio, que era o ponto.
- **Alimenta:** skill do exercício + parte do corpo; o encaixe pretendido é uma
  parte "Cardiovascular" mapeada em **Vitalidade** (junto com o Sono).
- **Streak / dano:** não / não.

> **A FC é relativa a VOCÊ, não a uma tabela de zonas.** FCmáx teórica precisa
> de idade e erra por 10-20 bpm em quem treina. A intensidade compara com a sua
> mediana recente — "foi mais forte que o seu normal?" — e só sai do neutro
> depois de 3 sessões com FC. Sem FC, conta só a duração.

### 4.12 Leitura ✅ (tipo-evento) — implementado em 2026-07-31
- **Domínio próprio de verdade:** o progresso é por **obra**, não por dia. "Li
  hoje" é hábito e o motor de hábitos já resolve; "estou na 180 de 400" não
  cabia em lugar nenhum.
- **Obra genérica** (`livro | curso | artigo | outro`) com unidade configurável
  (`pagina | capitulo | aula | modulo`) e `total_units` **opcional**.
- **Recompensa em dois momentos, nenhum por unidade** (página não é moeda):
  sessão paga a fração do avanço × fator de obra; concluir paga o valor cheio da
  dificuldade, uma vez só. Obra sem total paga trivial fixo, como Medidas.
  Fórmula em [02 §5.7](./02-economia.md).
- **`source_type`:** `reading`.
- **Alimenta:** skill escolhida na obra (`primary_skill_id`), com maestria.
- **Streak / dano:** não / não.
- **Anti-farm:** avanço só positivo (correção é edição da obra e não paga) e
  teto diário com a mesma curva de overshoot dos hábitos.

### 4.13 Diário ✅ (tipo-evento) — implementado em 2026-08-01
- **O caderno de papel continua sendo o caderno.** O módulo não substitui a
  escrita à mão; ele traz o que está nela para dentro do sistema **sem
  redigitar**.
- **Uma entrada por dia** (unique `(user_id, occurred_on)`): o diário é do DIA,
  não um mural. É também o que impede pagar duas vezes pelo mesmo dia.
- Campos: `mood` (1-5), `text` (o que **você** escreveu), `photo_url`/`audio_url`
  (bucket **privado** `journal-media`, URL assinada de validade curta) e
  `transcription` + `transcription_model` em coluna separada.
- **A mídia é a fonte da verdade; a transcrição é conveniência.** Foto e áudio
  ficam salvos e são o que se reabre daqui a dois anos. O texto extraído mora
  em coluna própria, é descartável e apagá-lo **não** apaga a mídia. Letra à mão
  fotografada com sombra erra — se a transcrição fosse o registro principal, uma
  leitura ruim viraria a memória daquele dia.
- **A transcrição por IA é sempre a pedido**, nunca automática ao salvar: mandar
  o diário para um prompt é escolha explícita, toda vez. Áudio ganha da foto
  quando existem os dois (fala ditada é mais fiel que caligrafia).
- **`source_type`:** `journal`. XP **trivial**, só na primeira gravação do dia —
  editar o texto à noite não rende de novo. Nunca proporcional ao tamanho do
  texto.
- **Streak / dano:** não / não.

### 4.14 Nutrição ✅ (tipo-evento) — implementado em 2026-08-01
- **Catálogo TACO embarcado** (`foods`, 582 alimentos com macros, por 100 g), no
  mesmo molde do catálogo de exercícios: importado uma vez por script, o app só
  lê.
- **A IA não inventa macro nenhum — ela escolhe uma linha da `foods`.** Mesmo
  princípio dos encontros diários (a IA escolhe o tema, o backend escolhe o
  número). Sem isso, uma alucinação contamina a série histórica em silêncio.
- **Fila de aprovação estrutural, não conveniência** (`nutrition_pending`, 36 h):
  "um prato de arroz" não é grandeza, então a porção proposta É um chute. A
  aprovação é onde estimativa vira dado. **Recusar não grava nada.**
- Macros são **congelados** em `nutrition_items` no momento do registro: uma
  correção futura no dataset não pode reescrever o que você comeu em março.
- **Duas recompensas, separadas de propósito:** registrar uma refeição paga
  trivial na hora; o **dia** paga a fração dos critérios ativos cumpridos no
  fechamento, igual ao Sono. `meta.kind` (`entry` | `day`) distingue as duas no
  ledger.
- **Nunca dano.** Um item específico pode virar hábito negativo, que já tem dano.
  O ato de comer, não.
- **Peso ditado vai para `body_measurements`**, nunca para uma tabela nova —
  duas fontes de peso é como se cria divergência entre dois gráficos do mesmo
  dado.
- **`source_type`:** `nutrition`. **Streak / dano:** não / não.

#### 4.14.1 O que a Fase 1 acrescentou (2026-08-05 e 2026-08-06)
- **Refeições são do usuário** ✅ — `nutrition_meal_slots` substituiu o enum de
  cinco valores. Cada slot tem nome, horário e **fatia do dia** (`share_pct`), e
  o alvo de uma refeição é uma FATIA do alvo do dia, nunca um número próprio:
  guardar gramas por refeição envelheceria em silêncio quando a meta do dia
  mudasse.
- **Alimento do usuário** ✅ — `foods.user_id` preenchido, `source='custom'`, com
  os macros do rótulo e porções próprias ("1 scoop = 30 g"). Na busca, `custom`
  vem **antes** de `taco`: quem cadastrou uma linha quer usá-la.
- **Faixa em vez de teto** ✅ — ver [02 §5.9.1](./02-economia.md). Corrigiu o dia
  de 300 kcal que era pago como sucesso.
- **Sódio** ✅ — o catálogo **já trazia** `sodium_mg` e o valor era descartado na
  ingestão. Passou a atravessar item → refeição → dia → critério, pelo mesmo
  caminho da fibra.
- **Água** ✅ — o único critério que não vem de alimento nenhum. Registro de um
  toque (200/300/500 ml), com desfazer, e **sem fila de aprovação**: não há chute
  de porção em "250 ml". Fica na Início do app, porque é o registro que mais
  acontece em movimento.
- **Receitas** ✅ (2026-08-06) — a combinação que se repete, salva com nome.
  Montar "meu shake" item a item custava quatro buscas por dia, e esse atrito é o
  que faz parar de registrar. Registrar a receita passa pelo **mesmo caminho** de
  uma refeição normal: paga o mesmo trivial e congela os macros igual — é atalho
  de digitação, não um tipo diferente de registro.
- **Média semanal** ✅ (2026-08-06) — critério separado que **convive** com o
  diário. Ver [06 §9.7](./06-dados.md).
- **Foto do rótulo por IA** ✅ (2026-08-06) — a IA **lê** a tabela impressa e
  preenche os campos; quem salva é você.
  - **Rótulo sim, prato não** — decisão de 2026-08-06. No rótulo o número está
    impresso, então errar é erro de OCR que a revisão pega. No prato a IA
    ESTIMARIA quanto pesa o arroz, e 150 g contra 250 g não tem como ser revisado
    por quem tirou a foto.
  - O rótulo brasileiro declara **por porção** e o catálogo é por 100 g. O prompt
    exige que a IA diga em que base leu, e o serviço converte — sem isso, um whey
    de 380 kcal/100 g viraria 380 por scoop, **três vezes o real**, sem sinal.
- **Código de barras** ✅ (2026-08-06, API) — `GET /nutrition/barcode/:code`
  devolve o alimento **ou `null`**, e o `null` é o ponto: é a tela dizendo "não
  conheço, quer cadastrar?", que é onde a foto do rótulo entra. A tela de bipe
  entra junto com a ampliação do catálogo — com as 582 linhas da TACO, todas
  genéricas e sem código de barras, bipar não acha nada.
- **Metas por peso e calculadora de TDEE** ✅ — ver [02 §5.9.2](./02-economia.md).
  A calculadora é **só web**: é configuração, e o app é registro em movimento
  ([08 §0](./08-navegacao-ux.md)). Os insumos fixos moram em `body_profile`, no
  Corpo, porque são dados da pessoa e não da dieta.

### 4.16 Trabalho ✅ (tipo-evento) — implementado em 2026-08-03
- **Pull, não outbox.** Cron a cada 15 min contra o `GET /tasks` do techSpace;
  **o sistema da empresa não muda uma linha** (princípio nº7).
- **Espelho fino:** `work_tasks` guarda o mínimo para pagar e para explicar o
  pagamento. O domínio continua lá.
- **`source_type`:** `work`. Dedupe por `external_id`.
- **Alimenta:** skill por projeto (`work_project_skills`) → atributo **Foco**.
  Sem mapeamento o módulo funciona; o XP vai só para o personagem.
- **Streak / dano:** não / não. Trabalho já tem pressão externa suficiente.
- Fórmula e a calibração anti-dominância em [02 §5.12](./02-economia.md).

> **O que a exploração do techSpace obrigou a mudar.** Quatro atritos que o
> desenho original não previa, e que o cliente absorve:
> - **sem autenticação server-to-server** → usuário robô, login automático, JWT
>   em cache de 80 dias. A senha fica no `.env` da API.
> - **sem endpoint de tempo agregado** → uma requisição por task concluída.
> - **`startDate`/`endDate` filtram o PRAZO**, não a conclusão, e excluem tasks
>   sem data → janela larga + filtro por `completedAt` do nosso lado.
> - **`userId` não é filtro puro** → traz tasks de outras pessoas em coluna de
>   revisão; filtramos por `taskUsers`.

#### 4.16.1 Trabalho PARALELO e os tetos configuráveis ✅ 🆕 (2026-08-06)

**O caso que quebrava a conta:** tocar cinco tarefas ao mesmo tempo faz um dia de
10 h somar **20 h ou mais** de tempo medido. Não é trapaça — é como o trabalho
real acontece.

**O que já protegia:** teto por tarefa (4 h, timer esquecido) e teto do dia (8 h,
a trava contra o trabalho dominar o extrato).

**Os dois furos que a auditoria de 2026-08-06 achou:**

1. **O teto REBAIXAVA em vez de parar.** Com o orçamento do dia esgotado,
   `paidMinutes` virava 0 — e isso caía no mesmo ramo do *"esqueci de
   cronometrar"*, que paga 0,15 a 0,4 de `easy`. Somado a um `Math.max(1, …)`,
   cada tarefa além do teto continuava rendendo. Num dia de 20 tarefas, as 12
   excedentes pagavam como se você tivesse esquecido o timer.
   → Agora são **três** casos: pagou (dentro do teto), sem timer (paga o mínimo,
   porque esquecer não pode virar punição) e **teto esgotado (paga zero)**.

2. **A estatística mentia.** A coluna guardava o valor já cortado, então o
   histórico perdia quanto tempo de fato foi medido.
   → `measured_minutes` passa a ser o **BRUTO** e `paid_minutes` o que entrou na
   conta. A tela mostra os dois: *"20 h medidas · 8 h pagas (40%)"*.

**Os tetos saíram do código** para `work_settings` ([06 §9.18](./06-dados.md)):
quem tem expediente de 6 h e quem tem de 10 h não compartilham o mesmo orçamento,
e o valor certo só aparece com uso real. Configuráveis em `/work`.

> **Registrar tudo, pagar dentro do teto.** O tempo que não paga continua no
> banco — some da economia, nunca do histórico.

### 4.17 Bucket list ✅ (camada meta, `kind: meta`) — implementado em 2026-08-03
- **O lugar do "algum dia".** Todo o resto do sistema tem prazo ou cadência; é
  o **único módulo onde não ter data é o estado normal**, e não esquecimento.
- Estado frouxo: `sonho → planejando → agendado → realizado`.
- **`source_type`:** `bucket`. `kind: meta` — não vira objetivo de boss
  ("realize 3 sonhos este mês" seria grotesco), mas move XP e Essência.
- **Conserta a camada 4 do [05 §7.1](./05-temporadas-boss.md):** vencer o boss
  **anual** desbloqueia um sonho. A "recompensa da vida real" era prometida e
  não existia — vencer dava pontos, item e lore, nada que se sinta fora do app.
- **Segundo destino da Essência:** cada item pode ter preço de desbloqueio.
- **Cutucão trimestral** (cron): traz um sonho à frente. Lista parada é lembrete
  de tudo que você não fez, e é o que separa lista viva de arquivo de
  arrependimento.
- **Sem anti-farm — o único módulo assim.** Ninguém finge uma viagem por 300 de
  XP; o custo do mundo real já é a verificação.

### 4.18 Relacionamentos ✅ (camada meta, `kind: meta`) — implementado em 2026-08-03
- **Mecanicamente novo:** todo hábito tem como alvo uma *definição*; aqui o alvo
  é uma **entidade com relógio próprio**. Falar com a mãe a cada 7 dias e com o
  João a cada 30 são o mesmo hábito com sujeitos e cadências diferentes — como
  hábitos seria um por pessoa, e streak/dano não fariam sentido.
- **Dois eixos:** manutenção (cadência por pessoa) e construção (pessoas novas +
  transições de estágio `novo → conhecido → próximo`).
- **`source_type`:** `relationship`. **Streak / dano:** não / não.
- A lista é ordenada por **quem está esfriando primeiro** — a ordenação é a
  mecânica; uma lista alfabética não lembra nada a ninguém.

> ⚠️ **Subgamificar de propósito.** É o único módulo onde a gamificação pode
> **piorar** o que ela mede: "liguei pra minha mãe e ganhei 20 de XP" corrompe o
> motivo. Por isso `kind = 'meta'` (não elegível a objetivo de boss), XP trivial
> com teto de um por pessoa por dia, sem Codex — e a interface fala em **tempo e
> pessoas**, nunca em pontos, até no texto do toast.

### 4.6 Módulos futuros (FORA do escopo atual) 🆕📋
**Decisão:** Dieta, Finanças e Foco **não entram agora** — o foco é deixar os módulos
existentes coerentes + a camada de núcleo/atributos/boss. Ficam documentados como
futuros porque a arquitetura plugável ([§1](#1-o-contrato-de-módulo)) já os suporta:
quando entrarem, é só tabelas de domínio + `_grant` + linha no `module_registry`,
**sem retrabalho** no resto do sistema. Esboço para quando voltarem:
- ~~**Dieta**~~ ✅ **existe** como **Nutrição** — ver §4.14.
- ~~**Trabalho**~~ ✅ **existe** — ver §4.16.
- **Finanças** (`finance`, tipo-evento): sinergia com a economia de ouro.
- ~~**Foco**~~ ✅ **existe** — sessões de foco, cortina que cobre o app e widget
  do desktop. Saiu da lista de futuros; ver [11](./11-tracking-tempo-de-tela.md).
- ~~**Cardio**~~ ✅ **existe** — ver §4.11.
- ~~**Leitura**~~ ✅ **existe** — ver §4.12.

### 4.7 Loja / Recompensas ✅ (gasto, não ganho)
- Não chama `_grant` (não gera XP); **gasta** ouro/Essência. Inclui equipamento,
  consumíveis e recompensas reais. Regras de gasto/portão → [02](./02-economia.md) e
  [03](./03-atributos-build.md).

### 4.8 Conquistas ✅ (camada meta, `kind: meta`)
- Não é atividade; é avaliada **genericamente sobre o ledger** (contar eventos por
  tipo, nível, streak…). Ver [01 §3](./01-arquitetura.md).

## 5. Tabela-resumo

| Módulo | `source_type` | Tipo | Alimenta | Streak | Dano |
|---|---|---|---|---|---|
| Hábitos | `habit` | hábito | skills | ✔ | ✔ |
| Treino | `workout` | evento | skills + partes | — | — |
| Medidas | `body_measurement` | evento | — | — | — |
| Metas corporais | `body_goal` | evento | parte do corpo (se vinculada) | — | — |
| Side Quests | `sidequest` | evento | skills | — | — |
| Tempo de tela | `tracking` | evento | — | — | — |
| **Sono** | `sleep` | evento | parte do corpo (Vitalidade) | — | — |
| **Cardio** | `cardio` | evento | skills + partes (Vitalidade) | — | — |
| **Leitura** | `reading` | evento | skill da obra | — | — |
| **Diário** | `journal` | evento | — | — | — |
| **Nutrição** | `nutrition` | evento | — | — | — |
| **Plano do dia** | `plan` | meta | — | — | — |
| **Trabalho** | `work` | evento | skill do projeto (Foco) | — | — |
| **Bucket list** | `bucket` | meta | — | — | — |
| **Relacionamentos** | `relationship` | meta | — | — | — |

Todos são `source_type`s de **atividade** (`kind: atividade` no registry) e, por
isso, elegíveis a objetivos de boss (05). `kind: meta` fica para a camada meta
(Conquistas, Boss, Loja, Morte, Personagem, Encontros) — ver §4.8 e §4.10.

(Skills e Partes do corpo não aparecem: são entidades transversais que **recebem** XP,
não `source_type`s. Dieta/Finanças/Foco: futuros, fora do escopo atual — ver §4.6.)

## 6. Decisões fechadas

1. ✔ **Medidas gamificadas (§4.4):** registrar medida dá XP trivial e vira objetivo
   de boss.
2. ✔ **Escopo (§4.6):** Dieta, Finanças e Foco **fora do escopo atual** (futuros). O
   foco agora é módulos existentes + núcleo/atributos/boss.
3. ✔ **`body_goal` é atividade (§4.4/§5):** `kind = 'atividade'` no registry — chama
   `_grant` e é elegível a objetivo de boss (`kind: meta` é só Conquistas/Boss).
4. ✔ **Metas ancoram na dificuldade (§4.4):** recompensa de `body_goal` vem de
   `difficulty_levels` (02 §4), com override opcional `reward_xp`/`reward_gold`.
