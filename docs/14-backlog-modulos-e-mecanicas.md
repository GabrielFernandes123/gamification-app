# 14 — Backlog de Módulos, Entradas e Mecânicas

> **Dono de:** NADA. Este documento é um **backlog de candidatos** levantado na
> sessão de exploração de 2026-07-29. Ele não define fórmula, schema nem contrato —
> quando um item for aprovado, o conteúdo **migra para o documento dono**
> (módulo → [04](./04-modulos.md); fórmula → [02](./02-economia.md); atributo →
> [03](./03-atributos-build.md); boss → [05](./05-temporadas-boss.md); tabela →
> [06](./06-dados.md); ordem → [07](./07-roadmap.md)) e aqui fica só a linha
> marcada como promovida.
>
> **Estado global:** duas levas executadas e o backlog TRIADO.
> **§0.1** lista o que saiu em 2026-07-31 (Cardio, Leitura, Troféu, Nêmese) e **§0** o
> que saiu em 2026-07-30 (HealthKit, Sono, Oráculo, Regularidade, Metas negociadas,
> Lacaio, Eventos diários).
>
> **O placar de estado é o §11** — é a tabela de consulta rápida e prevalece sobre o §7,
> que é o quadro de planejamento. O §12 registra a dívida de **notificações** (um bug
> real, diagnosticado e ainda não corrigido).
>
> Depois da triagem de 2026-07-31 **o backlog está integralmente decidido**:
> **13 aprovados**, 1 adiado (Ascensão, por dependência de calendário), 9 descartados e
> **nenhum item sem decisão**. Mais a dívida de notificações (§12).
>
> **Dois blocos de dependência definem a ordem:** o que precisa do **build nativo**
> (HealthKit, áudio do journaling, microfone da nutrição) sai junto; o resto não espera
> nada.

---

## 0.4 Varredura geral de 2026-08-04 (antes da build)

Auditoria de leitura dos 3 repos + banco (~250 rotas, 105 tabelas, 26 crons, ~150 links
entre docs), seguida da correção de tudo que ela achou. **Não é uma leva de features** —
é o fechamento das pontas soltas que quatro levas em cinco dias deixaram para trás.

### O que estava realmente quebrado

| Achado | Por que importava | Correção |
|---|---|---|
| Cron do diário **descartava a transcrição no primeiro erro** | Uma queda de rede apagava o áudio de um dia para sempre, em silêncio. Único ponto do sistema onde erro transitório virava perda permanente | `journal_entries.transcription_attempts`; desiste só em 5, e o pedido manual zera |
| `expireWeeklyContracts` e `narrative-beats` sem `try/catch` por item | Um contrato quebrado travava o laço **toda hora, para sempre** — os outros 99 nunca expiravam | Lote resiliente, igual ao `narrate-pending` que já era |
| **Cutucão da bucket list não notificava ninguém** | O cron carimbava `nudged_at`, mas `notification_rules.kind` não aceitava `'bucket'`. A mecânica existia desligada, e só via quem abrisse `/bucket` — exatamente quem não precisa ser cutucado | `kind = 'bucket'` + `bucketMessage()` + regra semeada às 10h de segunda |

### Funcionalidade que existia sem tela

**Ferrugem de skill (⑨) era invisível** — a maestria caía até zero e nada explicava por
quê. Um número que muda o que você ganha e não é mostrado é indistinguível de um bug.
Agora `GET /skills` devolve `idle_days`, `rust_state` e `mastery_factor` calculados
pela **mesma** fonte que o `_grant` usa (`economy/rust.ts`), e a tela só desenha.

Também ganharam tela: **orçamento da trégua** (mostrado *antes* de abrir, não na
mensagem de erro) e a **trégua retroativa**; **registro manual de sono** (sem ele, quem
não tem iPhone com HealthKit não tinha caminho nenhum); **editar leitura** e **editar
pessoa** (as mutations existiam sem botão); **histórico de contatos com apagar** (um
"falei com fulano" clicado por engano era permanente, e envenenava justamente o
"faz N dias" que é a informação principal da tela); **respec de atributos**, que só
existia no app e sumiu junto com a tela de personagem na Fase 0.

### O que sobrava

20 arquivos órfãos no app (incluindo `features/store` inteiro, resíduo do enxugamento),
2 no web, `expo-camera` + 4 deps nunca importadas, e as rotas `/store/rewards*` e
`/store/user-items*` — uma **terceira fachada** sobre a mesma tabela que `/store/items`
já servia. O `NSCameraUsageDescription` prometia "ler códigos de barras de alimentos",
funcionalidade que não existe — e é texto que a Apple lê na revisão.

### Fonte única onde havia cópia

Três duplicações que iam divergir na primeira mudança:

- **"hoje no fuso do usuário"** reescrito em 15 serviços → `common/date.ts:userToday()`.
  `objectives.service.ts` usava *duas* variantes no mesmo arquivo.
- **`ATTRIBUTE_KEYS`** declarado duas vezes → `common/attributes.ts`. Os dois arquivos
  já avisavam que HUD e combate não podem divergir; duas listas eram como fariam isso.
- **`difficulty_levels`** lido ad hoc em 13 lugares, em 3 variantes e com fallbacks
  diferentes → `common/difficulty.ts:difficultyAnchor()`. O de `close.service` caía para
  `?? 0`: hábito sem recompensa **e sem dano**.

### Achados de build (o `expo-doctor` estava em 18/21)

Nada disso apareceu na auditoria de código, e os três afetariam o EAS Build:
`yarn.lock` **e** `package-lock.json` coexistindo (o EAS infere o gerenciador do lock),
`@expo/ui` duplicado em versões diferentes (módulo nativo duplicado quebra build), e 12
pacotes fora da faixa do SDK 56. **Agora 21/21.**

### Leva complementar do mesmo dia: hábitos

Investigando "por que hábito semanal negativo é confuso", saiu um bug e dois
redesenhos.

**🔴 A semana estava deslocada um dia — e cobrava dano indevido.** `addDays`
compunha `Date.parse(iso + 'T00:00:00Z')` com `toDateOnly`, que lê componentes
**locais**. Em fuso negativo (o servidor roda em `America/Cuiaba`, UTC−4) toda
data voltava um dia:

```
addDays('2026-07-28', 0)  ->  '2026-07-27'
```

A semana do fechamento virava **sáb..qui** — deslocada e com 6 dias. A regra de
margem via menos dias restantes do que existiam e concluía "não dá mais para
cumprir" cedo demais. No dia 28/07 isso cobrou 66 de dano de quatro hábitos que
ainda tinham quatro dias inteiros de margem, e zerou três sequências junto.

**Um irmão do mesmo bug: o fechamento de PERÍODO estava uma semana atrasado.**
Os crons `weekly-close` (`5 3 * * 0`) e `monthly-close` rodavam em horário fixo
de UTC, "espelhando 03:05 UTC ≈ 00:05 America/Sao_Paulo". Em UTC−4 isso é
**23:05 de sábado** — a semana ainda não acabou, então `previousPeriod`
devolvia a semana retrasada e a que tinha acabado de fechar só era avaliada no
domingo seguinte. Confirmado no banco: `last_period_close = 18/07` num dia 30/07.

Virou um cron horário (`period-close`), no mesmo padrão do `daily-close`: cada
hábito fecha o SEU período assim que ele termina, no fuso do dono.
`last_period_close` já dava a idempotência.

O mesmo defeito de data estava em três serviços (`close.service`,
`habit-suggestions`, `requirements`), e nos limites de mês também. Agora há `addDaysIso` e
`monthBoundsIso` em `common/date.ts`, com aritmética de calendário do começo ao
fim. **Em servidor UTC o bug não aparece — foi por isso que passou.**

O dano foi estornado (`direction: 'gain'`, mesmo mecanismo da trégua
retroativa) e as sequências restauradas de `streak_at_log`.

**Negativo com agenda de período ganhou significado.** `weekly_target` era
gravado e nunca lido: o formulário pedia "Dias a resistir por semana", o card
exibia "4 dias/semana" com a barra CHEIA numa quinta-feira — num hábito de
evitar, lia-se *"meta batida, o resto está liberado"*. Agora é **teto de
recaídas do período**, e a barra representa a margem que SOBRA. Ver
[02 §5.19](./02-economia.md).

**"Ontem fechou sozinho".** Card na Início (e no Dashboard do web) para
corrigir o que o cron decidiu quando você esqueceu de marcar. Punir uma omissão
de interface não ensina disciplina — ensina que os números não são confiáveis, e
daí para frente o resto da gamificação perde efeito. Só entra o que o **cron**
fechou, que se identifica sozinho: ele roda no dia seguinte, então `created_at`
cai depois de `occurred_on`. O que você marcou à mão foi decisão, não
esquecimento. E aceita registrar **recaída** também — se só apagasse
consequência, seria um botão de desfazer dano, não uma correção.

### O que ficou de propósito

A tabela **`rewards`** continua existindo. As 3 linhas dela estão espelhadas em
`user_items` com o mesmo ID, nada aponta para ela e nenhum código a lê — é backup puro
da migração `20260726120000_unify_items.sql`. Derrubá-la é irreversível e não conserta
nada, então fica como decisão explícita, não esquecimento.

---

## 0.3 O que foi executado em 2026-08-02/03 (quarta leva — a que zerou o backlog)

Os 9 aprovados que sobravam, mais as quatro regras da trégua que a leva anterior não
cobriu. **Nenhum deles dependia do celular** — é uma leva de servidor/web, e por isso ela
saiu inteira antes do `eas build`.

| Item | Onde vive |
|---|---|
| ⑮ Reputação por módulo | `economy/reputation.ts` + radar em Estatísticas — [02 §5.15](./02-economia.md) |
| ⑯ Retrospectiva narrada | `narrative/retrospective.service.ts`, cron semanal, `kind='retrospectiva'` |
| ⑨ Skill enferrujada | `skills.last_xp_at` + `economy/rust.ts` — [02 §5.16](./02-economia.md) |
| ⑫ Cicatrizes | `economy/scars.ts` + `build/scars.service.ts` + aba **Marcas** — [02 §5.17](./02-economia.md) |
| ⑧ Limite de WIP | `wip/wip.service.ts` + slot de boss alocável — [06 §9.10](./06-dados.md) |
| ⑬ Preço que respira | `store/effort-price.service.ts` + régua na Loja — [02 §5.18](./02-economia.md) |
| §4.13 Bucket list | módulo `bucket` + `/bucket` — [04 §4.17](./04-modulos.md) |
| §4.14 Relacionamentos | módulo `relationships` + `/relationships` + card na Início — [04 §4.18](./04-modulos.md) |
| §4.1 Trabalho | módulo `work` + `TechSpaceClient` + `/work` — [04 §4.16](./04-modulos.md) |
| ⑩ Trégua completa | duração mínima, retroativa, orçamento, capítulo, relógios pausados |

**As divergências do spec e a armadilha que se repetiu quatro vezes estão no §11.4** — é
onde elas ficam visíveis para quem consultar o placar.

**Migrations aplicadas e verificadas no banco:** `20260802100000_retrospective`,
`20260802110000_skill_rust`, `20260802120000_scars`, `20260802130000_wip_limits`,
`20260802140000_effort_price`, `20260803100000_bucket_relationship_enum`,
`20260803100001_bucket`, `20260803100002_relationships`, `20260803110000_work_enum`,
`20260803110001_work`, `20260803120000_truce_rules`.

**O que sobrou para você fazer:** a build (§0.2) — que continua sendo a mesma, porque
nenhum item desta leva exigiu capability, permissão ou dependência nativa nova.

---

## 0.2 O que foi executado em 2026-08-01 (terceira leva — a do celular)

Esta leva juntou de propósito tudo que dependia de um build nativo, porque separá-las
custaria repetir o ciclo de portal Apple + provisioning que o [13](./13-ios-build-e-apple.md)
já registra como doloroso.

| Item | Estado | Onde vive agora |
|---|---|---|
| **Enxugar o app** | ✅ | 5 abas → 4; ~14.200 → ~5.500 linhas de rota — [08 §0](./08-navegacao-ux.md) |
| §4.15 Diário | ✅ | módulo `journal` na API + aba própria no app — [04 §4.13](./04-modulos.md) |
| §4.3 Nutrição | ✅ | módulo `nutrition` + catálogo TACO (582) — [04 §4.14](./04-modulos.md) |
| §5.2⑦ Intenção × execução | ✅ | `daily_plans` + cartão na Início — [02 §5.10](./02-economia.md) |
| §5.3⑩ Modo trégua | ✅ | `truce_periods` + `economy/truce.ts` — [02 §5.11](./02-economia.md) |
| §12 Notificações | ✅ | módulo `notifications` na API + tela no web — §12.8 |
| **Telas no web** | ✅ | `/nutrition`, `/journal`, `/plan` — o par de consulta/configuração de cada módulo novo |
| Config nativa | ✅ | 4 permissões + entitlement de HealthKit no `app.json` |

**A régua que quase deu errado:** o enxugamento foi feito antes das telas de consulta no web, e Diário/Nutrição/Plano quase fecharam a leva só com API e app — o `ModuleLauncher` já apontava para `/nutrition` e `/journal`, que não existiam. Virou regra no [08 §0.1](./08-navegacao-ux.md): **todo módulo do app precisa de par no web**, senão consultar e configurar não existem em lugar nenhum.

**A régua que organizou o enxugamento:** *o app é registro em movimento*. O dono passa o
dia na frente do PC, onde o web e os widgets do Electron já estão abertos — duplicar cada
tela no celular custava manutenção em dois lugares e deixava o app pesado justamente para
as três coisas que só ele faz: academia, mesa e cama.

**A regra que evitou quebrar tudo:** remover **rotas**, preservar **features**. O
`CharacterHud` usa `useActiveBuffs` da loja, o `HabitRow` também, o dashboard usa
temporada. Podar por intuição quebraria o HUD; podou-se só o que o `tsc` provou órfão.

**Três decisões que divergiram do plano original, e por quê:**
- **A fila da nutrição ganhou tabela própria** em vez de reusar
  `assistant_pending_actions`: aquela exige `thread_id` de uma conversa do assistente e
  expira em 1 hora, contra o caso de uso real de gravar no almoço e conferir à noite.
  O que foi reusado é o mecanismo de execução única, não a tabela.
- **O corpo da requisição de `/nutrition/voice` recebeu teto próprio de 12 MB** (o resto
  do app segue em 1 MB): áudio em base64 estoura os 100 KB padrão do Express, e afrouxar
  o limite global tiraria a defesa barata de todas as outras rotas.
- **A chave geral de push mudou de tabela.** Ver §12.8 — o `PushService` lia a chave do
  módulo de tempo de tela, então desligar o push do tracking calava hábitos e diário.

**Migrations aplicadas e verificadas no banco:** `20260801110000_journal_enum`,
`20260801110001_journal`, `20260801120000_nutrition_enum`, `20260801120001_nutrition`,
`20260801130000_notifications`, `20260801140000_plan_truce_enum`,
`20260801140001_plan_truce`, `20260801140002_plan_registry`.

**O que sobrou para você fazer:** habilitar HealthKit no App ID `com.gabriel.evolve`,
apagar os provisioning profiles e rodar `eas build --profile development --platform ios`
— uma vez, com tudo dentro.

---

## 0.1 O que foi executado em 2026-07-31 (segunda leva)

| Item | Estado | Onde vive agora |
|---|---|---|
| §4.5 Cardio | ✅ | modalidade em `workout_sessions` + ramo de pontuação em `body.service.ts` → [04 §4.11](./04-modulos.md) |
| §4.6 Leitura | ✅ | módulo `reading` na API + `/leitura` no web → [04 §4.12](./04-modulos.md) |
| §5.2④ Troféu do Codex | ✅ | `codex/trophy.ts` + forja em `BuildService.upgradeEquipment` |
| §5.2⑤ Nêmese com dente | ✅ | `economy/nemesis.ts`, aplicada no centro do `_grant` |

**O que a exploração corrigiu no próprio documento:**

1. **Este doc dizia que cardio "não cabe no schema de força". Cabia.** `workout_sets`
   já tinha `duration_seconds` e `distance_meters` desde o workout v2 — o que não cabia
   era a **economia**: `score = totalSets × 8 + normVolume / 600` dá 8 para 45 minutos de
   corrida, ou seja `trivial`. Virou um ramo de fórmula, não um módulo paralelo.
2. **Troféu e nêmese não precisaram de migration.** O inventário já era completo
   (`user_items` + quantidade + transações + `grantUserItem` público) e
   `character_equipment.attribute_bonuses` já era `jsonb` por instância.
3. **A armadilha da nêmese:** `goldMultipliers` do `_grant` **só valem no modo açúcar**, e
   treino/sono/medida/encontro usam o modo raw. Passar a penalidade pelos chamadores
   deixaria metade do sistema de fora **sem erro nenhum que denunciasse** — por isso ela é
   aplicada dentro do `grant()`, depois do `gold` calculado, nos dois modos.

**Migrations:** `20260731100000_cardio_reading_enum`, `20260731100001_cardio`,
`20260731100002_reading` — aplicadas e conferidas no banco.

**Efeito colateral bom:** regenerar o `db.ts` (parado em 1.561 linhas, agora 4.689)
expôs um drift que estava escondido — `habit_logs.caused_death` existia no banco e
faltava no log otimista do app.

**Ficou de fora, de propósito:** a tela de execução de cardio ainda usa o tipo de série
`isometric` (o único que grava duração). Funciona — o builder já o escolhe sozinho quando
o modelo é cardio — mas o rótulo "Isometria" numa corrida é ruim. Renomear por contexto é
polimento de UI e não bloqueia o uso.

## 0. O que foi executado em 2026-07-30

| Item | Estado | Onde vive agora |
|---|---|---|
| §2.1 HealthKit | ✅ código, lib e plugin prontos · 🚧 **falta a etapa manual no portal da Apple + build EAS** | `gamificacao-app/src/features/health/ios/healthkit.ts` |
| §4.4 Sono | ✅ | módulo `sleep` na API + `04-modulos.md` §4.9 |
| §5.1① Oráculo | ✅ | `BossEngineService.bossForecast` → `05-temporadas-boss.md` |
| §5.1② Regularidade | ✅ métrica (sem bônus) | `StatsService.overview.regularity` |
| §5.1③ Metas negociadas | ✅ **já existia**; entrou só o gatilho | `HabitSuggestionsService` |
| §5.2⑥ Distração é lacaio | ✅ | `gamificacao-api/src/codex/distraction.service.ts` |
| §5.5⑭ Eventos diários | ✅ | módulo `events` na API |

**A descoberta que mudou o plano:** *metas negociadas* **já estava construída** —
`habit_levels`, `habit_suggestions`, diagnóstico determinístico, candidatos com
patch, escolha por IA entre os candidatos, apply/dismiss, e UI no web **e** no
app. Faltava só uma coisa: **nada gerava sugestão sozinho**. Era preciso abrir o
hábito e pedir, ou seja, o sistema continuava só cobrando. Entrou um cron
semanal (`habit-suggestions-weekly`, segunda 06:10 UTC) que gera no máximo 2 por
usuário e só para os diagnósticos `too_easy`/`too_hard`. Construir a versão
"simples" que este documento previa teria criado um **segundo** sistema de
sugestão concorrendo com o primeiro — exatamente a falha de "duas economias
paralelas" que originou toda a refatoração.

**Migrations aplicadas e verificadas no banco:** `20260730100000_daily_events_enum`,
`20260730100001_daily_events`, `20260730110000_sleep_enum`, `20260730110001_sleep_module`.
Os valores de enum saíram em migration própria porque o Postgres recusa usar um
valor recém-criado na mesma transação — mesmo padrão de `ledger_gaps` →
`registry_meta_sources`.

**Custou menos do que o previsto em dois pontos:** o Oráculo e a Regularidade não
precisaram de migration nenhuma (é leitura sobre `boss_damage_events` e sobre o
`byDay` que o `/stats/overview` já montava), e o lacaio da distração também não —
`codex_entries.origin_type` é `text`, não enum, então a origem `tracking_source`
foi só uma mudança de tipo em TypeScript.

---

## 1. Como ler este documento

Cada candidato é avaliado por cinco coisas:

| Critério | O que significa |
|---|---|
| **Custo** | Esforço de construção (baixo / médio / alto) |
| **Atrito** | Toques por dia que exige de você. **O recurso mais escasso do sistema não é código, é atenção diária.** |
| **Alimenta** | O que ganha no build ([03](./03-atributos-build.md)) |
| **Destrava** | O que passa a ser possível e hoje não é |
| **Migration** | Se precisa mexer no banco ou é só leitura sobre o que já existe |

**Regra de corte adotada na sessão:** *só vira módulo o que tem domínio próprio;
o resto é hábito.* Ela sozinha evita metade do inchaço — o motor de hábitos de dois
níveis ([02 §5.1](./02-economia.md)) já resolve "comi 4 refeições", "2L de água",
"meditei", "arrumei a casa" sem uma linha de código nova.

---

## 2. Entradas automáticas (o bloco de maior retorno)

O gargalo do sistema não é mais capacidade de anexar módulo — a arquitetura plugável
resolveu isso ([04 §1](./04-modulos.md)). O gargalo é atenção diária. **Toda fonte que
alimenta o ledger sem você tocar no app vale mais que um módulo inteiro**, porque não
compete pelo mesmo dedo no mesmo dia.

| Entrada | Estado | Custo | O que traz |
|---|---|---|---|
| **Apple HealthKit** | ✅ **confirmado funcionando** (Haylou → Saúde) | baixo | Sono, FC, passos, SpO2 e possivelmente treinos |
| **techSpace — tasks** | 📋 endpoint pronto | baixo | Trabalho (ver §4.1) |
| ~~Atalhos do iOS + NFC~~ | ❌ **descartado 2026-07-31** | — | Mapeado em [10](./10-tracking-iphone-atalhos.md) e disponível se voltar a fazer sentido |
| ~~Geofence~~ | ❌ **descartado 2026-07-31** | — | Exigiria permissão "Sempre" e um build nativo próprio, servindo só o Treino |
| ~~GitHub/GitLab~~ | ❌ **descartado 2026-07-31** | — | Produção de código |
| ~~Google Calendar~~ | ❌ **descartado 2026-07-31** | — | Compromisso honrado vs. furado |
| ~~Pluggy / Open Finance~~ | ❌ **descartado 2026-07-31** | — | Caiu junto com Finanças |

### 2.1 HealthKit ✅ código pronto · 🚧 falta o build

O relógio **Haylou Solar Plus** sincroniza com o app Saúde via Haylou Fun, e o teste
foi feito: **funciona**. Isso muda o custo de tudo que depende de dado corporal.

- No iOS, HealthKit é **leitura liberada** — a limitação que travou o projeto é a de
  *Screen Time* ([12](./12-ios-limitacoes.md)), que é outra API.
- Requer: entitlement de HealthKit + descrições de uso no `Info.plist` + config plugin.
  O development build e a conta Apple paga (que costumam ser o bloqueio) **já existem**.
- Sincroniza quando o app abre — não precisa de background.
**O que já está no código (2026-07-30):**
- `src/features/health/ios/healthkit.ts` — a única superfície que toca o nativo, com
  `readSleepSessions` e `averageHeartRate`. O `require` é **opcional**: sem o módulo
  nativo (build atual), devolve vazio e o app segue funcionando. Quando o build chegar,
  passa a funcionar sozinho, sem tocar em mais nenhum arquivo.
- `useHealthSyncRunner` no layout raiz, ao lado do `useShieldSyncRunner`. Janela de 7
  dias; reenviar noite já importada é inofensivo (o backend deduplica por `externalId`).
- Fusão de amostras: o relógio parte a noite em vários pedaços, e pedaços com menos de
  1 hora de intervalo viram uma noite só — senão o backend, que guarda uma noite por
  data, descartaria os demais como duplicata. `inBed` (deitar sem dormir) fica de fora.
- `app.json` com `NSHealthShareUsageDescription` e o entitlement de HealthKit.

**Falta (é do usuário, não dá para automatizar daqui):** habilitar HealthKit no App ID,
apagar os provisioning profiles, `npm install` da lib e `eas build --profile development`.

- **Verificar ainda:** se além de sono e FC também sobem **Treinos** (Saúde → Atividade
  → Treinos). Se sim, Cardio (§4.5) nasce automático em vez de manual. `averageHeartRate`
  **já está pronta** para o modulador de ±20% do Cardio — entrou junto porque o
  entitlement e o build são os mesmos.

---

## 3. Achados sobre o `new-tech-space-api` (techSpace)

Sistema de trabalho próprio, com API e liberdade de modificação. É o sistema de onde
a gamificação foi extraída originalmente. Três achados relevantes:

### 3.1 O RPG antigo — ❌ descontinuado
`UserGamification`, `Skill`, `Habit`, `Reward`, `SideQuest`, `UserActiveBuff` ainda
existem no schema e há schedulers rodando. **Decisão do usuário: descontinuado.**
Fica registrado como pendência operacional: os schedulers antigos devem ser desligados
para não haver duas economias paralelas entre repositórios — exatamente o diagnóstico
que originou a refatoração ([00](./00-visao.md)).

### 3.2 O financeiro — ❌ fora de escopo (é da empresa)
Existe um módulo financeiro completo e bem modelado (conta, categoria hierárquica,
cartão com fatura, lançamento com recorrência/parcelamento, e **orçamento por categoria
× mês**). **É financeiro da empresa** — não entra. Fica registrado por um único motivo:
se um dia Finanças pessoal for construído (§4.2), **o desenho já existe e está provado**,
e copiar o modelo economiza a parte cara, que é o desenho, não a digitação.

### 3.3 As tasks — ✅ é o que ele usa hoje
Campos realmente usados: **nome, responsável, descrição, data e prioridade**.
Sprint, aprovação, story points, tamanho, colunas de review/correção: **não usados**.

Consequência honesta: o trabalho **não tem domínio próprio** com esse dado — é uma
lista de tarefas com prazo, mecanicamente igual a uma Side Quest. O que ele tem, e
nada mais na vida tem, é ser **o registro automático do maior bloco do dia**. É por
isso que ainda vale, e é só por isso.

---

## 4. Módulos candidatos

Fichas no formato do [04 §4](./04-modulos.md). Nenhuma aprovada.

### 4.1 Trabalho (`work`) — tipo-evento 📋 (desenho fechado em 2026-07-31)

**Integração: pull, não outbox.** O endpoint `GET /tasks?userId=&startDate=&endDate=`
já existe no techSpace. Um cron a cada 15 min na `gamificacao-api` resolve, e **o
sistema da empresa não muda uma linha**. Deduplicação pelo `external_id` no `source_id`
do ledger.

**Forma:** espelho fino. Tabela `work_tasks` com `external_id`, nome, projeto,
prioridade, prazo, concluída em — **sem lógica de domínio**. O domínio continua no
techSpace; do lado do jogo é só um `source_type` com linha no `module_registry`.

#### Recompensa — REESCRITA em 2026-07-31 (o usuário respondeu o §9)

As respostas mudaram o desenho: **ele usa o timesheet e move os cards pelo kanban**
(fazendo → revisão → feito). O volume varia muito — às vezes poucas tarefas grandes, às
vezes dezenas de 15-35 min.

> **A unidade certa é TEMPO MEDIDO, não tarefa contada.** 30 tarefas de 20 min ≈ 3 de 3h:
> esforço parecido, recompensa parecida. Contar tarefas trataria essas duas semanas como
> se fossem 10× diferentes. A versão anterior desta ficha (valor plano por task) está
> **superada**.

```
XP = f(minutos medidos no TaskTimesheet), ancorado na difficulty_levels
   × modulador leve de prioridade (±20%)
   com teto por tarefa e por dia
   pago na CONCLUSÃO
```

**Anti-farm resolvido sozinho.** A regra anterior ("criada hoje + fechada hoje vale
fração") fica **desnecessária**: tarefa falsa criada e fechada rende **zero minutos**, e
não se falsifica cronômetro sem ficar sentado ali. É a defesa mais forte de qualquer
módulo do sistema.

**Retrabalho volta a ser detectável.** Uma versão anterior deu isso como perdido porque
`is_correction` não é usado. **Errado:** o techSpace grava `actionType: 'TRANSITIONED'`
no `History` a cada movimento de card, então **voltar de "revisão" para "fazendo" é
retrabalho**, e dá para derivar tempo de ciclo e tempo parado em revisão — sem mudar nada
no sistema da empresa.

> ⚠️ **O maior risco do módulo: dominar o ledger.** Trabalho ocupa 8h do seu dia. Se 1h de
> treino vale ~40 XP e o trabalho pagasse na mesma régua, um dia normal valeria 320 e o
> ledger viraria 80% trabalho — hábitos, corpo, leitura e sono virariam decoração.
> **Calibrar para que um dia cheio de trabalho valha aproximadamente um bom dia de
> hábitos + treino. Significativo, nunca dominante.**

> ⚠️ **Pagar por tempo premia trabalhar devagar** — e o caso real não é trapaça, é
> **esquecer o timer rodando**. Defesas: teto por tarefa (~4h), teto por dia, e XP só na
> conclusão (devagar adia a recompensa em vez de aumentá-la).

**Justiça:** tarefa concluída **sem** timer paga um mínimo por prioridade, nunca zero —
esquecer de cronometrar não pode virar punição.

**Alimenta:** `projectId` → skill por projeto → atributo **Foco**. É a única dimensão
rica que sobrou, e é boa: mostra onde o esforço foi parar no mês.

**Streak/dano:** não/não. Trabalho já tem pressão externa suficiente; somar HP a isso
é o caminho mais curto para odiar abrir o app numa semana ruim.

**Destrava:** objetivos de boss que se cumprem sozinhos — nos meses em que a vida
pessoal aperta, o trabalho segura a temporada. Nenhum módulo manual faz isso.

**Não dá para ter, e é melhor aceitar do que fingir:** calibração intenção × execução,
qualidade de entrega, sprint como janela de temporada.

**Não sugerir** adicionar `storyPoints`/`size` ao techSpace para alimentar o jogo:
campo de estimativa que existe só para o RPG morre em duas semanas, e seria o jogo
invadindo o trabalho. Se entrarem um dia, que seja porque servem ao trabalho.

**⚠️ Em aberto:** o `TaskTimesheet` (timer com pausa) já existe. **Se for usado**, o
tempo real é esforço *medido* — a melhor fonte de dificuldade possível, sem campo novo
e sem atrito, e a mecânica de intenção × execução (§5.1) nasce de graça.

### 4.2 ~~Finanças (`finance`)~~ — ❌ DESCARTADO em 2026-07-31

**Status:** o financeiro do techSpace é da empresa (§3.2). Se for construído, é do zero
na `gamificacao-api`, reusando o *desenho* provado.

**Open Finance / Pluggy:** o **Meu Pluggy** é gratuito por tempo indeterminado para
contas **suas e nominais** — encaixa exatamente num app pessoal. **Uso comercial exige
plano pago (a partir de ~R$ 2.500/mês)**, ou seja: no dia que o app for distribuído,
essa rota morre. Consentimento vale **12 meses** e precisa renovar no banco;
conectores com MFA pedem re-autenticação. Sincronização = webhook + cron de
reconciliação. A transação já vem categorizada e enriquecida.

> **Consequência arquitetural:** o módulo **não pode nascer acoplado ao Pluggy**.
> Domínio = lançamento manual + importação; Pluggy é **um provider atrás de uma
> interface**, igual OpenRouter na narrativa. Manual → OFX/CSV → Pluggy viram três
> adapters do mesmo domínio.

**O risco de design — a segunda economia:** a tentação óbvia é mapear R$ → ouro.
**Não fazer.** Um mês de bônus quebraria a economia e o sistema passaria a premiar
*ter dinheiro* em vez de *comportamento financeiro*. Regra: **recompensa ancorada na
`difficulty_levels`, nunca no valor em R$**. O R$ define se você cumpriu, não quanto ganha.

| Comportamento | Mecânica existente que reusa |
|---|---|
| Envelope por categoria ("lazer ≤ R$400") | Hábito **negativo com limite + dano escalante** |
| Registrar/categorizar | Tipo-evento, XP trivial (igual Medidas) |
| Conta paga antes do vencimento | Tipo-evento + `deadline` |
| Aporte/reserva recorrente | Meta composta → **dungeon** no Codex |
| Quitar dívida / meta de patrimônio | Meta composta longa → **criatura** do Codex |

**Sinergia que amarra o sistema:** a Loja de recompensas reais ganha **lastro**. Hoje
"recompensa da vida real" é honra. Com Finanças, ela debita do envelope de lazer de
verdade — ouro compra a *permissão*, o envelope paga a *conta*. É o gancho central do
[05](./05-temporadas-boss.md) finalmente com dentes.

**Alimenta:** skill "Disciplina financeira" → **Foco**. Zero mecânica nova.

### 4.3 Nutrição (`diet`) — 📋 **aprovado em 2026-07-31** (nível C com voz)

**O problema não é dado, é atrito.** Rastreio completo de macros morre em duas semanas.
Três níveis, construir em camadas:

- **Nível A — nenhum módulo.** "4 refeições", "sem doce", "2L de água" já são hábitos
  de dois níveis. **Vale checar se não é isso que basta.**
- **Nível B — porções (o ponto ótimo, começar aqui).** Refeição registrada por
  componentes, não gramas: proteína ✓, vegetal ✓, carbo ✓, ultraprocessado ✗. Um toque
  por refeição, ~10s/dia. Sobrevive ao mês 6.
- **Nível C — macros.** Só vale se for pesar comida de verdade.

#### Decisão de 2026-07-31: nível C, com voz + fila de aprovação

O usuário escolheu **peso/macros completos**, apostando em facilitadores para vencer o
atrito. O fluxo:

```
1. Grava:   "almoço: 150g de frango, arroz, salada. peso hoje 82,4"
2. IA transcreve (OpenRouter multimodal — mesmo canal do journaling §4.15)
3. IA estrutura: alimento + quantidade + refeição · e a medida corporal
4. Cai em PENDÊNCIA — nada é gravado ainda
5. Você revisa e aprova, item a item ou em lote no fim do dia
6. Aprovado vira registro + XP
```

**O passo 4 já tem mecanismo pronto:** `assistant_pending_actions` implementa
`pending → approved/rejected` com trava de execução única e expiração. É literalmente o
"deixa pendente de aprovação" pedido.

> **A IA NÃO inventa macros — ela escolhe uma linha da tabela.** O banco de alimentos
> (TACO embarcada + Open Food Facts) é a fonte dos números; a IA faz o *match* entre
> "arroz" e a linha certa. Mesmo princípio dos encontros diários e das sugestões de
> hábito. Sem isso, um modelo alucinando "150g de frango = 600 kcal" contamina a série
> histórica em silêncio.

> **A fila de aprovação é ESTRUTURAL, não conveniência.** "Um prato de arroz" não é uma
> grandeza — a IA vai chutar porções e vai errar. A aprovação é o momento em que
> estimativa vira dado. Sem ela você teria uma série que *parece* precisa e não é, o que
> é pior que não ter série.

**Peso e medidas vão para o módulo que JÁ EXISTE.** `body_measurements` tem `weight_kg`,
cintura, braço e o resto, com XP trivial e avaliação de metas. A voz roteia a medida para
lá — duas fontes de peso é como se cria divergência.

**Recompensa: reusar o modelo do Sono** (§4.4) — N critérios configuráveis, paga a
**fração dos ativos cumpridos**: proteína ≥ 140g · calorias ≤ 2.400 · 3+ refeições
registradas. O registro em si paga trivial, como Medidas — o que precisa sobreviver é o
**hábito de registrar**.

**Plano B que salva a série:** nos dias sem gravação, um resumo de um toque ("3 refeições,
proteína ok, 1 ultraprocessado") mantém a tendência viva sem fingir precisão de macros.
Melhor um dia grosso que um buraco.

**⚠️ Bloqueio:** o microfone exige **build nativo** — o mesmo pendente do HealthKit e do
áudio do journaling. Nutrição, journaling e HealthKit deveriam sair na mesma leva nativa,
consumindo a mesma pipeline de voz.

**Bases (todas gratuitas):** **TACO** (UNICAMP, ~600 alimentos) — tratar como **dataset
embarcado**, não API, exatamente como o catálogo de 1.324 exercícios; **Open Food Facts**
(industrializados por código de barras, licença aberta, scanner via `expo-camera`);
**TBCA** (~5.000 itens, mas licença sem clareza).

**Alimenta:** **Vitalidade** — fecha o buraco do atributo que hoje só vem de partes do corpo.

> ⚠️ **Não aplicar o dano escalante em "comer demais".** O motor negativo foi feito
> para limite/vício; usá-lo para ingestão vira reforço de restrição — a mecânica pune
> por comer, todos os dias, com escalada. Premiar aderência (dias que contam, positivo)
> dá o mesmo resultado sem o efeito colateral. Item específico (doce, álcool,
> ultraprocessado) como hábito negativo: tudo bem — a diferença é rastrear *um item*
> vs. *o ato de comer*.

### 4.4 Sono (`sleep`) — tipo-evento ✅ (implementado em 2026-07-30)

> **Dono a partir daqui:** [04-modulos.md §4.9](./04-modulos.md). Esta seção fica
> como registro da decisão; a ficha do módulo vive lá.
>
> Nasceu como "tipo-hábito" nesta exploração e foi implementado como
> **tipo-evento**: sem streak próprio (o streak de personagem já conta o dia) e
> sem dano, que era a condição de segurança combinada abaixo.

**Fonte: ✅ resolvida.** HealthKit (§2.1). Um `_grant` por noite, deduplicado pela data.

**Fallbacks se algum dado faltar:** Atalho do iOS disparado ao ativar o Modo Sono ou
desligar o alarme (zero toque); ou o próprio Modo Sono do iPhone, que grava horários
sem relógio nenhum.

> **Premiar a hora de deitar, não as horas dormidas.** Você controla quando vai para
> a cama; não controla se pega no sono nem se o cachorro late às 3h. Um hábito de "≥7h"
> pune insônia — mesma armadilha da nutrição. "Deitar até 23h30" é o comportamento real
> e é o que move o resto. Duração fica como **dado de acompanhamento** (gráfico,
> correlação com treino), nunca como fonte de recompensa ou dano.

**Fases do sono (profundo/leve/REM) de wearable barato são estimativa de acelerômetro**
— bonitas no gráfico, pouco confiáveis e mecanicamente inúteis, porque você não as controla.

**Alimenta:** **Vitalidade**. E destrava a primeira mecânica que liga um módulo no
outro em vez de só somar XP: **noite ruim reduz a regeneração de HP do dia seguinte**.

### 4.5 Cardio (`cardio`) — tipo-evento ✅ (implementado em 2026-07-31)

> **Dono a partir daqui:** [04 §4.11](./04-modulos.md); fórmula em
> [02 §5.6](./02-economia.md).

> ⚠️ **Correção:** o parágrafo abaixo estava ERRADO e fica só como registro.
> `workout_sets` **já tinha** `duration_seconds` e `distance_meters`. O schema
> sempre coube; quem não cabia era a economia. A solução foi uma **modalidade na
> sessão** com ramo de pontuação próprio — não um domínio paralelo.

**~~Por que não cabe no Treino atual:~~** o módulo de treino é de força (exercício, divisão,
séries, volume, parte do corpo). Cardio tem duração, distância, ritmo e FC. Enfiar
corrida no schema de séries envenena os dois.

**Forma:** modalidade nova dentro do Corpo, com `source_type: cardio` **próprio** — custa
uma linha no registry e paga na hora, dando filtro no histórico e **objetivo de boss
mirando cardio especificamente**, que é o ponto, já que hoje ele é o buraco.

**Dificuldade:** **duração como base, FC média como modificador ±20%** — o mesmo padrão
do treino (volume ±20%), sem conceito novo. O relógio dá a FC de graça.

**Alimenta:** uma **parte do corpo "Cardiovascular"** mapeada em **Vitalidade**. Partes
do corpo já são entidade transversal que recebe XP e aponta para um atributo — zero
mecânica nova. Cardio e Sono convergindo no mesmo atributo é coerente com a vida real.

⚠️ **Dois cuidados:** (1) **sessão ≠ passos** — corrida é evento, 10 mil passos é hábito;
contar os dois paga a corrida duas vezes; (2) **importação automática duplica** — se o
HealthKit trouxer treinos, deduplicar por janela de horário contra o registro manual.

### 4.13 Bucket list — 📋 aprovado em 2026-07-31

**O problema que resolve:** o sistema não tem lugar para **"algum dia"**. Tudo tem prazo
ou cadência — hábito repete, side quest vence, meta composta avalia por período, desafio
expira. Desejo sem data não cabe em lugar nenhum, e some.

**Forma:** título, categoria (viagem, experiência, marco, aprendizado), referência
visual, e um estado frouxo: `sonho` → `planejando` → `agendado` → **`realizado`**.
Prazo é OPCIONAL — é o único módulo onde não ter data é o estado normal, não esquecimento.

**O encaixe que faz valer a pena — conserta um buraco que já existe:**

O [05](./05-temporadas-boss.md) lista "recompensa da vida real" como uma das cinco
camadas de recompensa, mas **não existe catálogo**. Vencer o boss anual hoje dá pontos de
atributo, item e lore — nada que se sinta fora do app. E a **Essência** sobe sem destino
à altura.

A bucket list é esse catálogo, pelos dois caminhos que o 05 já previu:
1. **Desbloqueio direto** — vencer o anual libera um item. Não "ganhei 500 de ouro":
   *ganhei a viagem*.
2. **Essência acumulada** — cada item tem um preço, e a moeda premium passa a ter onde ser
   gasta de forma que importa.

**Ao realizar:** XP alto, entrada permanente no Codex, capítulo na narrativa, arte gerada.
É o tipo de momento que o sistema inteiro foi construído para celebrar e hoje não tem o
que celebrar.

**O detalhe que evita a lista morta:** lista parada é lembrete de tudo que você não fez.
O sistema precisa **puxar assunto** — uma vez por trimestre, ou quando a temporada abre,
trazer um item à frente ("faltam quatro meses do ano e nenhum sonho saiu do papel").
Custa uma leitura e um card, e é o que separa lista viva de arquivo de arrependimento.

**Farm:** nenhum. É o único módulo da lista inteira sem problema de trapaça — ninguém
finge uma viagem por 300 de XP, e o custo do mundo real já é a verificação.

### 4.14 Relacionamentos — 📋 aprovado em 2026-07-31

**Por que é mecanicamente novo:** todo hábito do sistema tem como alvo uma *definição*
("treinar", "ler"). Aqui o alvo é uma **entidade com relógio próprio** — falar com a mãe
a cada 7 dias e com o João a cada 30 são o mesmo hábito com sujeitos e cadências
diferentes. Não dá para emular com hábitos: seria um hábito por pessoa, e streak/dano não
fariam sentido nenhum.

**Dois eixos, e eles são mecânicas diferentes** (mesma estrutura de dois níveis dos
hábitos, aplicada a pessoas):

| Eixo | Forma | Exemplo |
|---|---|---|
| **Manutenção** | cadência por pessoa | "faz 23 dias que você não fala com X" |
| **Construção** | contagem num período | "3 pessoas novas no círculo este ano" |

**O que faz a construção acontecer de verdade:**

1. **Assimetria de valor** — o **primeiro** contato com alguém novo vale mais que o 50º
   com alguém antigo. Sem isso o sistema premia só quem você já vê, e "construir" nunca
   sai do papel.
2. **Transição de estágio** — cada pessoa tem `novo → conhecido → próximo`. Subir alguém
   de patamar é avaliação sua, qualitativa, e paga como conclusão de meta. É exatamente o
   que "construir um relacionamento" significa, e nenhum contador de contatos captura.

**Alternativa para o eixo de construção:** "fazer um amigo novo este ano" é, na forma, um
item de **bucket list** (§4.13). Se a expansão for de baixa frequência (2-3 por ano), ela
pode morar lá e Relacionamentos fica só com a manutenção, que é o que ele faz bem.
Decidir pelo volume: muitas metas de expansão → mecânica própria; duas → bucket list.

> ⚠️ **Subgamificar de propósito.** Este é o único módulo onde a gamificação pode
> **piorar** o que ela mede: "liguei pra minha mãe e ganhei 20 de XP" corrompe o motivo,
> e "conhecer pessoas para bater meta" é pior ainda. Então: **nunca dano, nunca streak,
> XP trivial, sem objetivo de boss, sem Codex.** A tela fala em **tempo e pessoas**, não
> em pontos. O valor real aqui é 90% lembrete e 10% jogo — e ele merece existir pelo
> lembrete.

### 4.15 Journaling / humor — 📋 aprovado em 2026-07-31

**O valor não está nele mesmo.** Sozinho é um diário; ele existe pelo que alimenta:

1. **A narrativa deixa de ser sobre métricas.** O prompt dos beats hoje recebe lore, boss
   e eventos de dano — ele narra o que você *marcou*. Com diário, narra o que você
   *viveu*, e essa é a diferença entre horóscopo e observação.
2. **Humor é o único eixo subjetivo do sistema** e atravessa todos os módulos. *"Seus
   piores dias de humor são os seguintes às noites mal dormidas"* é um achado que nenhum
   outro módulo consegue produzir.
3. **É a matéria-prima da retrospectiva (⑯)** — os dois foram aprovados juntos e devem
   entrar juntos.

**Recompensa:** XP trivial por registrar, como Medidas. **Nunca proporcional ao tamanho
do texto** — isso premiaria encher linguiça.

#### Entrada por foto, ditado e áudio (pedido do usuário)

O usuário escreve num **diário físico**; o objetivo é não redigitar.

**Foto — pronto para montar.** `expo-image-picker` já está instalado, o
`ImageUploadPicker` existe e o upload ao Supabase Storage já roda em metas corporais e
treinos.

**OCR — barato.** A geração de imagem já passa pelo OpenRouter
(`OPENROUTER_IMAGE_MODEL_LIGHT=google/gemini-3.1-flash-image`); modelos de visão pelo
mesmo canal leem foto de caderno. Falta só uma variante do `completeJson` que aceite
`image_url` no conteúdo.

> **A foto é a fonte da verdade; o texto extraído é conveniência.** A imagem fica salva
> sempre e é o que se reabre daqui a dois anos; o OCR preenche um campo `transcricao`
> separado, marcado como gerado por IA e editável. Letra à mão fotografada com sombra
> erra — se o texto extraído fosse o registro principal, uma leitura ruim viraria a sua
> memória daquele dia.

**Áudio — três necessidades diferentes, e a mais provável é grátis:**

**Decisão de 2026-07-31: gravar e transcrever pela IA, pelo mesmo OpenRouter.**

Ele aceita **áudio como bloco de entrada** no chat completions (`input_audio`, base64,
wav/mp3) nos modelos multimodais. Mesmo caminho do OCR, outro tipo de bloco — sem segundo
provedor e sem API de transcrição separada.

> Uma versão anterior deste doc marcava isso como "ponto de menor certeza". **Retificado:
> é viável pelo canal que já existe.** O que resta são limites práticos, não de
> viabilidade.

Três limites a respeitar:

1. **O microfone exige build nativo** — dependência de áudio + `NSMicrophoneUsageDescription`.
   É o mesmo build pendente do HealthKit; áudio e HealthKit deveriam sair juntos.
2. **Tamanho** — o áudio vai em base64 no corpo. Gravar comprimido e **fatiar gravações
   longas** em blocos transcritos em sequência.
3. **Custo por minuto** — entrar no mesmo padrão do `AI_IMAGES_MONTHLY_CAP` já usado na
   arte: teto mensal de minutos, senão uma semana falante vira conta desagradável.

**O ditado do teclado do iOS continua valendo** como caminho de custo zero para quem só
quer não redigitar — mas não substitui a gravação, que guarda a voz como registro.

E vale a mesma regra do OCR: **o áudio é a fonte da verdade, a transcrição é
conveniência.** O arquivo fica salvo; o texto é gerado, editável e marcado como IA.

**Privacidade — decidir antes de construir:** o texto do diário é **o dado mais pessoal
do sistema**. Mandar para um prompt de IA (OCR ou narrativa) tem de ser escolha
explícita, por entrada ou global, e nunca o padrão.

### 4.6 Outros candidatos (fichas curtas)

| Módulo | Custo | Atrito | Por que | Veredito |
|---|---|---|---|---|
| **Journaling/humor** | baixo | 1 toque | Ver ficha em §4.15. | 📋 **Aprovado em 2026-07-31** |
| ~~**Saúde clínica**~~ | baixo | quase zero | Consultas, exames, medicação, vacinas. | ❌ **Descartado em 2026-07-31** |
| **Relacionamentos** | médio | baixo | Ver ficha em §4.14. | 📋 **Aprovado em 2026-07-31** |
| ~~**Projetos pessoais**~~ | médio | baixo | 80% já existe: `composite_goals` com `frequency: 'manual'` e `repeatable: false` já é um marco com critérios, e já vira criatura no Codex. Faltava só o contêiner agrupador. | ❌ **Descartado em 2026-07-31** — o problema já está quase resolvido |
| **Leitura/estudo com progresso** | baixo | baixo | Progresso *por obra* — é o que hábito nenhum resolve. | ✅ **Feito** (2026-07-31) → [04 §4.12](./04-modulos.md) |
| ~~**Criação/output**~~ | baixo | baixo | Seria o inverso da Leitura: obra de tamanho **desconhecido**, então pagaria por estágio (rascunho → 1ª versão → revisado → publicado), com o grosso no fim — porque o problema de quem cria é terminar, não começar. Publicada, viraria relíquia no inventário, reusando o padrão do troféu. | ❌ **Descartado em 2026-07-31**: exige matéria-prima que não existe hoje. Sem criar de fato, o módulo nasce vazio. Reabrir só se isso mudar. |
| **Bucket list** | baixo | ~zero | Ver ficha em §4.13. | 📋 **Aprovado em 2026-07-31** |
| **Foco/Pomodoro** | — | — | **Já existe** (FocusCurtain, widget Electron, sessões). Não é módulo futuro. | ❌ Feito |
| Meditação, casa, skincare, hidratação, generosidade | — | — | Hábito com nome bonito. Inchaço sem mecânica nova. | ❌ Não |
| Idiomas, investimentos detalhados | — | — | App dedicado faz melhor; importar resultado > reimplementar. | ❌ Não |

---

## 5. Mecânicas sobre o que já existe

**Este é o bloco de melhor retorno do documento.** Não adicionam superfície de entrada
— fazem valer mais o que já foi construído e pago: o ledger, o Codex, a engine de boss,
a camada de IA, o tracking de tempo de tela.

### 5.1 Em cima do ledger (sem migration, só leitura) — ✅ os três implementados

**① Oráculo — a projeção.** ✅ `BossEngineService.bossForecast`, no snapshot da
temporada. Ritmo de 7 dias (e não da janela inteira, para reagir à semana ruim),
ritmo da janela para comparação, ritmo necessário e veredito
`adiantado | no-prazo | apertado | nao-cai`. Aparece como chip no card do boss do
Dashboard e como linha colada na barra de HP na História. Dizer, a qualquer momento: *"no ritmo atual o boss cai dia
27"* — ou que não cai. O item mais barato da lista e o que mais muda comportamento;
projeção de chegada é o único número que faz alguém agir hoje. O HP já é calibrado
mirando o dia 26-29 ([05](./05-temporadas-boss.md)) — **o sistema já sabe a conta, só
não te conta**. Vestido de narrativa, é literalmente um oráculo.

**② Regularidade como stat.** ✅ `regularity` no `/stats/overview`: coeficiente de
variação do XP diário **com os dias parados incluídos** (é o zero que separa o
distribuído do concentrado), `score = 100 × (1 − cv)`, mais `topDayShare` — o número
que explica o score numa frase ("38% do seu mês saiu de um dia só"). Aparece como
`StatCrystal` na Visão geral, ao lado do `ConsistencyGrid`.

> ⚠️ **Ainda NÃO é bônus de XP.** Fórmula de economia tem dono ([02](./02-economia.md))
> e isso só vira mecânica depois de calibrado com dado real.

**③ Metas negociadas.** ✅ — e a máquina **já existia** (ver §0). O que faltava era o
gatilho: nada gerava sugestão sozinho, então o sistema seguia só cobrando. Entrou o cron
`habit-suggestions-weekly` (segunda 06:10 UTC), que passa pelo diagnóstico
determinístico ANTES de gastar chamada de IA, ignora hábito com sugestão pendente e
cria no máximo 2 por usuário por rodada — cinco cards de uma vez não são cinco decisões,
são zero decisões.

### 5.2 Ligar sistemas que existem e não se tocam

**④ Troféu do Codex vira equipamento.** ✅ implementado em 2026-07-31.

Criatura derrotada deixa um item de categoria `trofeu` na bolsa — **um por criatura, com
o nome dela**, e não um "material comum ×7": a identidade é o valor do Codex, e escolher
qual sacrificar é a decisão interessante. Raridade por esforço (nêmese `rare`, guardião
de dungeon `uncommon`). Idempotente por entrada, então o guardião que cai toda semana não
vira sete despojos.

Forja: `POST /build/equipment/:id/upgrade` consome **3 troféus** e dá **+1 atributo**, com
teto de **3 pontos por peça**. **Sem migration** — o bônus entra no `attribute_bonuses`
da instância (já `jsonb`) e o quanto foi forjado é contado no extrato de inventário, não
guardado numa chave paralela.

**⑤ Nêmese com dente.** ✅ implementado em 2026-07-31.

**−15% de ouro** enquanto houver ao menos uma nêmese solta (`epithet` preenchido e status
`escapou`/`orfa`). Regras que valem a pena estar escritas:

- **Não escala com a quantidade.** Duas nêmeses não dobram o castigo — a mensagem é
  "existe uma dívida", não "você está falido".
- **Só sobre ganho** (`gold > 0`): aplicar em delta negativo daria desconto em compra e
  em morte, o oposto de uma penalidade.
- **XP intocado** — atrasar nível e equipamento puniria duas vezes.
- O `meta` do evento registra `nemesisPenalty`, senão um evento isolado fica inexplicável.
- **Visibilidade é parte da mecânica:** chip no HUD (web e app) nomeando quem cobra e
  levando à caçada, que já existia.

**⑥ Distração é lacaio.** ✅ `DistractionService`, rodando dentro do cron `boss-daily`
(o contexto de boss/janela/fuso já está resolvido ali — cron novo seria peça a mais).

Ciclo, as duas metades idempotentes:
- **nasce** — um lacaio por boss mensal, da fonte que mais consumiu os últimos 30 dias,
  com piso de 1 hora (nomear ruído desvaloriza o Codex). Batismo e retrato vêm de graça
  pelo `StoryIdentityService` e pelo cron de arte, que já cobrem `kind = 'creature'`.
- **resolve** — quando a janela do boss fecha, compara o consumo médio diário do período
  com os 30 dias anteriores ao nascimento: queda ≥30% → derrotado; senão escapou (e a 3ª
  fuga vira nêmese pela máquina que já existe). **Sem linha de base não há queda a
  comprovar**, então o benefício da dúvida fica com a criatura.

A linha de base é recalculada de `usage_daily` (histórico, não muda) em vez de guardada
numa coluna nova — menos schema, mesma resposta. **Não precisou de migration**:
`codex_entries.origin_type` é `text`, não enum.

**⑦ Intenção × execução.** 📋 **aprovado em 2026-07-31** para a próxima leva.

O sistema registra **o que você fez**, nunca **o que disse que ia fazer**.

> **Metade já existe.** `weekly_contracts` está construído e funcionando — tabela com
> `stake_item_kind`/`stake_quantity`, custódia e devolução da aposta, aba "Contratos" no
> web e batismo pela IA com o tom certo. O contrato mede se você **cumpriu**.

O que falta é a outra metade, e é a mais valiosa: **calibração** — se você **sabia** que
ia cumprir.

- **Declaração**: de manhã, ~15 segundos, você toca nos hábitos/missões que *vai* fazer.
  Sem aposta, sem compromisso.
- **Comparação**: no fechamento diário, que já roda no `CloseService`.
- **O dado novo**: *"você planeja 8 e faz 5, há três semanas"*. Não é "você falhou" — é
  "você se superestima em 60%", que é informação sobre **julgamento**, não sobre esforço.
  E é acionável de um jeito que taxa de acerto nunca é: a correção não é *esforçar-se
  mais*, é *planejar 5*.

Conversa direto com as **metas negociadas** (③), que já rodam: o cron sugere baixar a
meta quando você falha; a calibração explica por quê.

> ⚠️ **Errar a previsão não pode custar NADA.** Se falhar o plano tirar HP ou ouro, você
> aprende a prever pouco — declara dois hábitos, acerta sempre, e o número fica lindo e
> inútil. O incentivo tem de ser prever **bem**, não prever **baixo**: bônus por precisão,
> nada por imprecisão. E o hábito falhado já foi punido pelo motor de hábitos — cobrar de
> novo pela previsão erraria duas vezes o mesmo dia.

**Se o `TaskTimesheet` for usado (§4.1), o trabalho é o domínio ideal para estrear** — os
dois lados (estimado × real) já são medidos.

### 5.3 Contenção — falta no design, não no código

**⑧ Limite de WIP da vida.** Emprestado do kanban do techSpace (`wipLimit`): um teto de
compromissos **ativos ao mesmo tempo**.

Todo sistema de hábitos morre igual — a pessoa chega em 18 ativos, falha em 12 por dia e
desiste dos 18. O teto força a **escolha**, que é a decisão interessante que o sistema
hoje não faz ninguém tomar.

Quatro regras que decidem se ele ajuda ou irrita:

1. **Teto por tipo, não global.** 10 hábitos + 3 objetivos é situação diferente de 13
   hábitos.
2. **Criar sempre funciona; ATIVAR é que é limitado.** Bloquear a criação é hostil — a
   ideia veio agora. O item além do teto nasce em `fila`, e ativá-lo exige escolher o que
   sai.
3. **O teto inicial é o que você já tem.** Se você tem 12 hábitos e o teto nascer em 7, o
   app abre dizendo que 5 precisam morrer — péssima primeira impressão de uma mecânica
   que quer ajudar. Nasce em `atual` e só desce por escolha.
4. **Subir o teto é recompensa de boss.** Vira **eixo de progressão** em vez de
   restrição: você não está limitado, está *ainda* limitado.

Item em trégua (⑩) não conta para o teto.

**Onde o teto mora — correção de 2026-07-31.** Uma versão anterior deste doc chamou isto
de "design quase puro". **Errado:** se o teto sobe por recompensa de boss, ele precisa ser
persistido *e* rastreável.

Há precedente exato no sistema — **`character_attribute_point_grants`** (`points` +
`allocated_points`): você ganha do boss e escolhe onde alocar. O WIP segue a mesma forma:

- **Teto base por tipo** (hábitos, objetivos, leituras), nascendo igual ao que já existe
- **Slot concedido** por vitória de boss
- **Você escolhe o tipo** que recebe o slot — mais um hábito *ou* mais um objetivo
- **Teto efetivo** = base + slots alocados naquele tipo

Vira uma decisão em vez de um número automático, no mesmo padrão dos pontos de atributo.
Custo: tabela pequena + checagem na ativação + gancho na recompensa do boss. Barato, mas
**não de graça**.

**⑨ Skill enferrujada.** Skill só sobe. Sem XP há semanas, o multiplicador de maestria
fica **dormente** até ser tocada de novo — sem perder nível, sem punição real.

> ⚠️ **Correção de 2026-07-31.** Eu havia registrado que `skills.updated_at` resolveria
> de graça. **Está errado pela metade:** o trigger dispara em QUALQUER update — renomear,
> trocar a cor, mudar o atributo. Renomear uma skill parada há 3 meses a "reviveria" sem
> nenhum XP.
>
> A correção é uma coluna **`last_xp_at`**, escrita só no caminho do `_grant`. Migration
> mínima e semanticamente correta: "última vez **exercitada**", não "última vez que a
> linha mudou". Vale para qualquer outra mecânica tentada sobre `updated_at`.

```
dias desde last_xp_at:
  0-21   → maestria cheia
  22-56  → decai linearmente
  >56    → dormente (bônus zero)

fator    = clamp(0, 1, (56 - dias) / 35)
maestria = 1 + min(0,5; nível × 0,01) × fator
```

Três semanas de tolerância antes de cair (uma viagem de duas semanas não mexe em nada) e
cinco para zerar.

**As duas regras que fazem não ser cruel:** nível e XP **nunca caem** — hiberna o bônus,
não a história; e **a volta é imediata e integral** — um evento restaura tudo. É
interruptor, não penitência proporcional ao abandono. Mesma filosofia da reputação (⑮).

**Bordas a decidir:** skill nunca usada vira dormente em 8 semanas (tudo bem — nível 1 dá
+1%); e skill de **hábito arquivado** enferruja, que é o único caso em que a ferrugem não
é escolha sua.

**⑩ Modo trégua.** Não existe e **vai doer**. Férias, gripe, viagem, luto: hoje isso é
dano acumulado, streak destruído e boss perdido — o sistema pune exatamente quando a vida
já está punindo.

**Esta tabela É a mecânica:**

| Sistema | Em trégua |
|---|---|
| Dano de hábito no fechamento diário | **pausado** |
| Zeragem de streak | **congelado** (não zera, não incrementa) |
| Contra-ataque do boss por meta diária perdida | **pausado** |
| Decaimento de reputação (⑮) | **pausado** |
| Ferrugem de skill (⑨) | **relógio congelado** |
| Ganho de XP/ouro se você fizer algo | **normal** |
| **Janela do boss** | **CONTINUA CORRENDO** |

> **A última linha é a mais importante.** Se a trégua pausasse o calendário, viraria um
> botão de "pausar o jogo" e a temporada perderia o sentido — dava para esticar um boss
> mensal por seis meses. **Você descansa da punição, não do tempo.** Trégua longa
> provavelmente custa o boss do mês, e isso é honesto: ela protege o personagem e as
> sequências, não a vitória.

**Ativação:**
- **Declarada com antecedência, mínimo 3 dias.** Sem mínimo vira escudo diário, acionado
  toda noite que você ia falhar.
- **Retroativa até 2 dias**, com limite — o caso é real (febre, sem abrir o app), e negá-lo
  é a rigidez que a trégua existe para consertar. Reverter dano vira **evento
  compensatório** no extrato, não apagamento: `character_damage_events` já tem
  `direction: gain`.
- **Orçamento por temporada** (~21 dias/ano); além disso, custa Essência.

> Esta é a **terceira** mecânica desta rodada apontando para a Essência (bucket list,
> cicatrizes, trégua). A moeda estar órfã já não é hipótese.

**Narrativa:** "o herói se recolhe" — um capítulo na saída e outro na volta. É um dos
poucos momentos em que a narrativa tem algo genuinamente humano a dizer.

### 5.4 Late-game — o diagnóstico original ainda sem resposta

O problema que originou toda a refatoração foi *"XP e ouro sem propósito no late-game"*
([00](./00-visao.md)). O boss resolveu o **médio** prazo. O que acontece depois de vencer
o anual continua em aberto.

**⑪ Ascensão.** Vencer o anual desbloqueia **modificadores permanentes de dificuldade**
opcionais (boss com mais HP, dano dobrado por meta perdida, menos margem), cada um valendo
mais recompensa. Solução clássica de roguelike, encaixa direto na camada meta, e transforma
"já venci" em "quão longe eu consigo".

**⑫ Cicatrizes.** 📋 **aprovado em 2026-07-31**.

Hoje morrer **só tira**. O `DeathService` já distingue os três modos — só o `hardcore`
zera a camada RUN e volta ao nível 1; o `seasonal` (padrão) tira parte do ouro e do HP e
derruba streaks — e a camada META sempre sobrevive. Mas nada **sobra**: o `death_count` é
um contador que aparece no HUD e não faz mais nada.

**A ideia:** cada morte deixa uma marca permanente com **troca real** — não castigo, desvio.

| Cicatriz | Perde | Ganha |
|---|---|---|
| Coração partido | −5% de HP máximo | +10% de ouro |
| Mão trêmula | −10% de crítico | +15% de XP de hábito |
| Osso velho | −1 Vitalidade | +1 Força |

**Você escolhe entre 2-3 opções** na hora da morte — mesmo princípio da forja: o valor não
está no modificador, está em *de que você abre mão*. A IA veste com nome e história pela
máquina de batismo que já existe.

**Por que muda a morte:** hoje ela é perda limpa — você era X, virou X menos alguma coisa,
e nada mudou sobre **quem** você é. Com cicatriz, o personagem depois de três mortes é
mecanicamente **diferente**: mais frágil e mais ganancioso, ou mais lento e mais forte. O
histórico de mortes vira **identidade** em vez de vergonha.

> ⚠️ **A armadilha é o acúmulo.** Dez mortes e você é um trapo. Duas saídas, usar as duas:
>
> - **Teto de 3 cicatrizes ativas.** A quarta empurra a mais antiga para "cicatrizes
>   antigas": continua visível na ficha e na história, mas **mecanicamente inerte**.
>   História infinita, penalidade limitada.
> - **Remover custa Essência** — e este é o **segundo destino** para a moeda premium que
>   apareceu nesta rodada (o primeiro foi a bucket list). Duas mecânicas independentes
>   convergindo no mesmo problema é sinal de que a Essência está mesmo órfã.

**Decisão pendente:** vale nos três `death_mode` ou só no `hardcore`? Leitura atual —
**vale em todos, com intensidade escalando pelo modo**. Quem escolheu `soft` escolheu um
jogo mais leve, e −5% de HP permanente contradiz a escolha; mas zerar a cicatriz no modo
leve tira a única coisa boa que a morte deixava.

### 5.5 Economia

**⑬ Preço que respira.** 📋 **aprovado em 2026-07-31**.

"Calibrar ouro" está no [07](./07-roadmap.md) como item vago — e vai continuar vago,
porque **não é um número para acertar uma vez, é um alvo que se move a cada módulo novo**.
A loja foi calibrada com 5 módulos; hoje são 9 (entraram tracking, sono, cardio, leitura,
encontros). Uma recompensa pensada como "uma semana de esforço" hoje custa três dias.

**A virada:** parar de precificar em ouro e precificar em **dias de esforço**.

```
preço_exibido = dias_de_esforço × média diária de ouro dos últimos 30 dias
```

Módulo novo entra, sua produção sobe, o preço em ouro sobe junto — e continua custando
cinco dias. O sistema se auto-calibra e ninguém mexe nisso de novo.

> **Não há brecha para trapaça, por construção.** Produzir menos barateia o item, mas
> derruba sua renda na mesma proporção: o tempo até conseguir comprar não muda. A
> mecânica é neutra a esforço sem precisar de trava nenhuma.

**Cadência — decidido em 2026-07-31: a cada 15 dias.** Encaixa no ritmo que já existe: o
boss recalibra no checkpoint do dia ~15 ([05 §3.6](./05-temporadas-boss.md)), então a
economia inteira passa a respirar em dois tempos (dia 1 e dia 15) em vez de ter dois
calendários concorrentes.

Dois detalhes sem os quais a cadência curta piora as coisas:

1. **Cadência ≠ janela.** Recalcular a cada 15 dias, mas sempre sobre a média dos
   **últimos 30**. Se a janela encolher junto, uma semana de viagem derruba a média pela
   metade e tudo fica barato do nada.
2. **Teto de ±15% por ciclo.** Sem clamp, um período excepcional dobra o preço de tudo de
   uma vez — e o sistema pune a sensação de ter ido bem. Mesmo princípio do clamp que a
   recalibração do boss já usa.

**Histórico de preços** — decidido em 2026-07-31. Guardar por ciclo (`dias`, `ouro`,
`média diária usada`) e mostrar a tendência; o `Sparkline` já existe.

> ⚠️ **Armadilha de leitura:** preço em ouro subindo é **notícia boa exibida como má** —
> significa que você está produzindo mais, não que encareceu. A manchete do card tem de
> ser **os dias** (constantes), com o ouro como número derivado:
> *"**5 dias de esforço** · 1.100 de ouro neste ciclo ▲12% (você rendeu mais)"*.
> Invertido, vira fonte de irritação em vez de calibração.

**Escopo:** só **recompensas reais** (`user_items` compráveis). Poção, buff e equipamento
são itens internos, balanceados contra o jogo e não contra a sua vida — se o preço deles
respirar, nada no sistema tem mais valor fixo.

**Recompensas abstratas: a IA precifica** — decidido em 2026-07-31.

O problema: "quantos dias vale comprar o item X?" não tem âncora, e a resposta vira chute
com cara de precisão. **A pergunta certa não é absoluta, é relativa:**

> *Você já disse que jantar fora = 3 dias e jogo novo = 6 dias. Onde entra "item X"?*

Comparação é fácil (para humano e para modelo) e **melhora sozinha conforme o catálogo
cresce**. O assistente já tem as ferramentas exatas — `get_reward_catalog`,
`get_spending`, `get_economy_flow` — e não precisa de nenhuma nova.

Vale a mesma disciplina de sempre: **a IA propõe, o sistema limita, você decide.** Ela
devolve dias dentro de um intervalo com clamp, ancorada no catálogo; nunca grava direto.

**Campo opcional de preço real (R$)** ajuda a IA a posicionar relativo aos outros itens.

> Isto **não** contradiz o princípio nº1 do §6 ("nunca ancorar recompensa em unidade
> externa"): aquele princípio é sobre **entrada** — ganhar ouro proporcional a reais
> quebraria a economia num mês de bônus. Aqui é **saída**, e o custo de uma recompensa
> real razoavelmente acompanha o custo real dela. Direções opostas; só a primeira é
> perigosa.

**⑭ Eventos diários com escolha.** ✅ módulo `events` na API + card no Dashboard.

- **Geração preguiçosa** na primeira leitura do dia: sem cron, sem token gasto com quem
  não abriu o app, sem linha morta no banco. `unique (user_id, day)` garante o mesmo
  encontro em dois refreshes.
- **IA camada 4 com fallback de catálogo** (6 encontros fixos, sorteio com semente
  estável). Validação estrita: saída fora do contrato vira catálogo, porque gravar um
  encontro sem opção clicável é pior que o fallback.
- **A IA escolhe tema e texto; o backend escolhe os números.** O prompt proíbe citar
  quantidades; o modelo devolve só `effect: gold | buff | gamble`. Tetos: ouro 5-40,
  buff `damage_reduction` de 20% por 12h, aposta 2× ou nada. Sem essa fronteira, uma
  alucinação vira inflação.
- Sorteio com semente por (evento, opção): não dá para "rerolar" fechando a tela.
- `source_type: 'event'` no ledger — movimento de moeda passa pelo livro, sem exceção.

**⑮ Reputação por módulo (facções).** 📋 **aprovado em 2026-07-31**.

Cada `source_type` do registry vira uma facção com um número de 0 a 100 que sobe com uso
e **decai sozinho** com o abandono.

O ponto não é medir uso — o histórico já faz isso. É medir **abandono**, que hoje é
invisível: você só descobre que largou o Corpo quando a IA escolhe Corpo como fraqueza do
boss e você pensa "ué, por quê?".

**Sem migration** — leitura agregada sobre `economy_events` (que já tem `source_type` e
`occurred_on`), mesmo padrão do Oráculo e da Regularidade:

```
frequência = dias com evento daquele módulo nos últimos 30
recência   = dias desde o último evento
reputação  = 100 × frequência_normalizada × decaimento(recência)
```

O decaimento é o que faz doer: sem evento, a reputação **derrete** dia a dia, em vez de
ficar parada em "8 treinos no mês passado".

**Onde aparece:** o `RadarChart` das Estatísticas (hoje usado para os 4 atributos) com um
eixo por módulo ativo — um losango bonito ou uma aranha aleijada, legível em meio segundo.

> ⚠️ **A armadilha mais séria das três.** O impulso natural é fazer reputação baixa
> **reduzir** a recompensa daquele módulo. É espiral de morte: abandonou cardio → cardio
> rende menos → abandona mais. O sistema passa a punir quem já está mal.
>
> **Faça o contrário:** reputação baixa torna o **retorno mais valioso** —
> *"você não corre há 23 dias; o primeiro cardio da semana vale +40%"*. Vira convite em
> vez de castigo, e ataca justamente o que a métrica mede. É a mesma lógica das metas
> negociadas (③): propor a volta, não cobrar a ausência.

**O que destrava:** a escolha de fraqueza do boss pela IA hoje é caixa-preta. Com
reputação, o mesmo sinal fica **legível** — e mecânica ilegível é ruído.

**⑯ Retrospectiva narrada.** Um capítulo semanal gerado sobre a crônica que já existe.
Praticamente de graça dado o `StoryIdentityService`, e é o que transforma histórico em memória.

---

## 6. Princípios de design descobertos nesta sessão

Valem para qualquer módulo futuro e deveriam ser promovidos ao [00](./00-visao.md) se aprovados:

1. **Nunca ancorar recompensa numa unidade externa** (R$, kg, km, commits). Sempre na
   `difficulty_levels`. A unidade externa decide *se cumpriu*, não *quanto ganha*.
2. **Premiar o que você controla.** Hora de deitar, não horas dormidas. Aderência ao
   plano, não peso na balança. Sair de casa, não o resultado.
3. **Dano é pressão de hábito, não de vida.** Não usar HP em trabalho, insônia ou
   ingestão. Onde já há pressão externa, o jogo não precisa somar.
4. **Preferir gatilho validado por terceiro.** Onde não existir, usar a regra do tempo
   (criado hoje + concluído hoje = fração) — barato e premia planejar.
5. **Toda importação precisa de deduplicação explícita** (id externo + janela de tempo).
   É o bug clássico de integração.
6. **Provider externo sempre atrás de uma interface.** Pluggy, HealthKit, techSpace,
   OpenRouter — o domínio nunca conhece o fornecedor.
7. **O jogo não invade o trabalho.** Não adicionar campo ao sistema da empresa para
   alimentar o RPG. Se o campo entrar, que sirva ao trabalho.
8. **Atenção diária é o recurso escasso, não código.** Entre um módulo manual e uma
   integração automática, a integração vence quase sempre.

---

## 7. Quadro consolidado

> ⚠️ Este é o quadro de **planejamento** (custo, atrito, migration) e não reflete estado.
> Para saber o que foi feito, descartado ou aprovado, ver **§11** — ele prevalece.

| # | Candidato | Tipo | Custo | Atrito/dia | Alimenta | Migration |
|---|---|---|---|---|---|---|
| 2.1 | HealthKit | entrada | baixo | zero | — | não |
| 4.4 | **Sono** | módulo | baixo | zero (via ✅ HealthKit) | Vitalidade | sim |
| 4.5 | **Cardio** | módulo | médio | zero–baixo | Vitalidade | sim |
| 4.1 | **Trabalho** | módulo | médio | zero | Foco | sim |
| 4.3 | Nutrição (nível B) | módulo | médio | ~10s | Vitalidade | sim |
| 4.2 | Finanças | módulo | alto | baixo | Foco | sim |
| 5.1① | **Oráculo** | mecânica | **baixo** | zero | — | **não** |
| 5.1② | Regularidade | mecânica | baixo | zero | — | não |
| 5.1③ | Metas negociadas | mecânica | baixo | zero | — | não |
| 5.2④ | Codex → equipamento | mecânica | médio | zero | — | sim |
| 5.2⑤ | Nêmese com dente | mecânica | baixo | zero | — | talvez |
| 5.2⑥ | **Distração é lacaio** | mecânica | baixo | zero | — | talvez |
| 5.2⑦ | Intenção × execução | mecânica | médio | baixo | — | sim |
| 5.3⑧ | **Limite de WIP** | mecânica | **baixo** | zero | — | talvez |
| 5.3⑨ | Skill enferrujada | mecânica | baixo | zero | — | não |
| 5.3⑩ | **Modo trégua** | mecânica | médio | zero | — | sim |
| 5.4⑪ | Ascensão | mecânica | médio | zero | — | sim |
| 5.4⑫ | Cicatrizes | mecânica | baixo | zero | — | sim |
| 5.5⑬ | Preço que respira | mecânica | baixo | zero | — | não |
| 5.5⑭ | Eventos diários | mecânica | médio | 1 toque | — | sim |
| 5.5⑮ | Reputação por módulo | mecânica | baixo | zero | — | não |
| 5.5⑯ | Retrospectiva narrada | mecânica | baixo | zero | — | não |

---

## 8. Ordem sugerida — pós-triagem de 2026-07-31

> A ordem original desta seção (de 2026-07-29) foi **cumprida ou substituída**: Oráculo,
> Sono, Cardio, Distração é lacaio e as demais já saíram nas duas levas. O que segue é a
> fila **atual**.

**Consertar antes de construir:**

0. **Notificações (§12)** — é dívida, não feature: o bug do "1 de ouro" incomoda todo
   dia, e o lembrete de hábito já feito corrói a confiança no que o app avisa. Nada novo
   deveria entrar na frente disso.

**Aprovados, do mais barato ao mais caro:**

1. **Reputação por módulo** (⑮) — leitura agregada do ledger, sem migration
2. **Preço que respira** (⑬) — resolve "calibrar ouro" de vez, e some do roadmap
3. **Cicatrizes** (⑫) — reusa a máquina de morte; dá o 2º destino à Essência
4. **Bucket list** (§4.13) — CRUD simples, mas conserta o prêmio do boss anual
5. **Retrospectiva narrada** (⑯) — sem migration; melhor junto do journaling
6. **Journaling** (§4.15) — foto + OCR + ditado; par da retrospectiva
7. **Intenção × execução** (⑦) — metade pronta (`weekly_contracts`); falta a calibração
8. **Relacionamentos** (§4.14) — deliberadamente subgamificado

9. **Modo trégua** (⑩) — o único com prazo: só é sentido no primeiro mês ruim
10. **Skill enferrujada** (⑨) — precisa da coluna `last_xp_at`
11. **Limite de WIP** (⑧) — teto persistido + slot alocável de boss

> **⑩ deveria subir na fila se você previr um mês difícil.** Os outros dez esperam sem
> custo; ele é o único cuja ausência tem data.

**Os dois grandes que sobraram:**

12. **Trabalho** (§4.1) — **não espera nada** e o atrito diário é zero. XP por tempo
    medido; o cronômetro resolve o anti-farm sozinho
13. **Nutrição** (§4.3) — **espera o build nativo** (microfone), então sai na mesma leva
    de HealthKit + áudio do journaling, compartilhando a pipeline de voz

**Adiado:** ⑪ Ascensão — depois do primeiro ciclo anual completo.

> **A leva nativa virou um bloco:** HealthKit (build pendente desde 2026-07-30), áudio do
> journaling e microfone da nutrição são o **mesmo** `eas build` e a **mesma** pipeline
> multimodal do OpenRouter. Fazer os três juntos evita repetir o ciclo de portal Apple +
> provisioning que o [13](./13-ios-build-e-apple.md) registra como chato.

---

## 9. Perguntas em aberto

| # | Pergunta | O que muda |
|---|---|---|
| 1 | ~~O `TaskTimesheet` é usado?~~ | ✅ **SIM** (2026-07-31). Virou a base da recompensa: XP por tempo medido (§4.1) |
| 2 | ~~Quantas tasks por semana?~~ | ✅ **Varia muito** — às vezes poucas grandes, às vezes dezenas de 15-35 min. Foi o que provou que **contar tarefas é a unidade errada** |
| 3 | ~~Move os cards pelo kanban?~~ | ✅ **SIM** (fazendo/revisão/feito). Com o `History` gravando `TRANSITIONED`, **retrabalho volta a ser detectável** |
| 4 | O **HealthKit traz Treinos** além de sono/FC? | Decide se Cardio é importação ou registro manual |
| 5 | ~~Nutrição: nível A basta?~~ | ✅ **Não** (2026-07-31) — escolhido o **nível C** (macros) com voz + fila de aprovação (§4.3) |
| 6 | Os **schedulers do RPG antigo** no techSpace foram desligados? | Evita duas economias paralelas entre repositórios |

---

## 10. Fontes externas consultadas

- [Meu Pluggy — API de Open Finance grátis](https://www.pluggy.ai/meu-pluggy) · [Planos e preços](https://www.pluggy.ai/precos)
- [TACO — dataset de composição nutricional](https://www.kaggle.com/datasets/ispangler/composio-nutricional-de-alimentos-taco) · [taco-api](https://github.com/raulfdm/taco-api) · [TBCA](https://www.tbca.net.br/)
- [Haylou Fun — App Store](https://apps.apple.com/br/app/haylou-fun/id1534983357)

---

## 11. Placar geral — todos os pontos levantados

> **Esta é a tabela de consulta rápida.** O §7 é o quadro de *planejamento* (custo,
> atrito, migration); este é o de *estado*. Se os dois divergirem, este vale.
>
> Legenda: ✅ feito · 🚧 parcial (falta algo fora do código) · 📋 projetado, não iniciado
> · ❌ descartado ou fora de escopo.

### 11.1 Entradas automáticas (§2)

| Item | Estado | Observação |
|---|---|---|
| Apple HealthKit | 🚧 | Código, lib e config **prontos e verificados** (4 permissões + entitlement no `app.json`). Falta só o que é seu: habilitar a capability no App ID, apagar os provisioning profiles e rodar o `eas build`. Até lá o require opcional devolve vazio e nada quebra. |
| techSpace — tasks | ✅ 2026-08-03 | `GET /tasks?userId&startDate&endDate` já existe; a integração seria pull por cron, sem tocar no sistema da empresa. |
| Atalhos do iOS + NFC | ❌ | Descartado em 2026-07-31. Continua mapeado em [10](./10-tracking-iphone-atalhos.md) se voltar a fazer sentido. |
| Geofence | ❌ | Descartado em 2026-07-31. |
| GitHub/GitLab | ❌ | Descartado em 2026-07-31. |
| Google Calendar | ❌ | Descartado em 2026-07-31. |
| Pluggy / Open Finance | ❌ | Descartado em 2026-07-31, junto com Finanças. |

### 11.2 Módulos (§4)

| Item | Estado | Onde vive |
|---|---|---|
| §4.4 Sono | ✅ 2026-07-30 | [04 §4.9](./04-modulos.md) · [02 §5.4](./02-economia.md) |
| §4.5 Cardio | ✅ 2026-07-31 | [04 §4.11](./04-modulos.md) · [02 §5.6](./02-economia.md) |
| §4.6 Leitura | ✅ 2026-07-31 | [04 §4.12](./04-modulos.md) · [02 §5.7](./02-economia.md) |
| §4.1 Trabalho (`work`) | ✅ 2026-08-03 | XP por **tempo medido**; usuário robô no techSpace. [04 §4.16](./04-modulos.md) · [02 §5.12](./02-economia.md) |
| §4.2 Finanças | ❌ | Descartado em 2026-07-31. Era o maior e o único dependente de terceiro (Pluggy). O desenho fica registrado no §4.2 caso volte. |
| §4.3 Nutrição | ✅ 2026-08-01 | TACO (582 alimentos) + voz + fila de aprovação de 36 h. [04 §4.14](./04-modulos.md) · [02 §5.9](./02-economia.md) · [06 §9.7](./06-dados.md) |
| Journaling/humor | ✅ 2026-08-01 | Aba própria no app. Foto + áudio + transcrição multimodal **a pedido**. [04 §4.13](./04-modulos.md) · [02 §5.8](./02-economia.md) · [06 §9.6](./06-dados.md) |
| Saúde clínica | ❌ | Descartado em 2026-07-31. |
| Relacionamentos | ✅ 2026-08-03 | Ficha em §4.14. Dois eixos: manutenção (cadência por pessoa) e construção (contagem + estágio). Subgamificar de propósito. |
| Projetos pessoais | ❌ | Descartado em 2026-07-31 — `composite_goals` manuais já cobrem. |
| Criação/output | ❌ | **Descartado em 2026-07-31** — sem matéria-prima hoje; nasceria vazio. |
| Bucket list | ✅ 2026-08-03 | Ficha em §4.13. Vira o catálogo da recompensa real do boss anual e dá destino à Essência. |
| Foco/Pomodoro | ✅ | Já existia antes deste backlog (FocusCurtain, widget, sessões). |
| Meditação, casa, skincare, hidratação, generosidade | ❌ | Hábito com nome bonito — inchaço sem mecânica nova. |
| Idiomas, investimentos detalhados | ❌ | App dedicado faz melhor; importar > reimplementar. |

### 11.3 Mecânicas (§5)

| # | Item | Estado | Onde vive |
|---|---|---|---|
| ① | Oráculo (projeção do boss) | ✅ 2026-07-30 | `BossEngineService.bossForecast` · [05 §3.7](./05-temporadas-boss.md) |
| ② | Regularidade | ✅ 2026-07-30 | `StatsService.overview.regularity` · [02 §9.2](./02-economia.md) — **métrica, ainda não é bônus** |
| ③ | Metas negociadas | ✅ 2026-07-30 | `HabitSuggestionsService` — **já existia**; entrou só o cron semanal |
| ④ | Troféu do Codex → equipamento | ✅ 2026-07-31 | `codex/trophy.ts` + `BuildService.upgradeEquipment` |
| ⑤ | Nêmese com dente | ✅ 2026-07-31 | `economy/nemesis.ts` · [02 §9.3](./02-economia.md) |
| ⑥ | Distração é lacaio | ✅ 2026-07-30 | `codex/distraction.service.ts`, dentro do cron `boss-daily` |
| ⑦ | Intenção × execução | ✅ 2026-08-01 | `daily_plans` + cartão na Início. **Só bônus, nunca custo** — [02 §5.10](./02-economia.md) |
| ⑧ | Limite de WIP da vida | ✅ 2026-08-02 | Teto por tipo; slot de boss alocável (padrão dos pontos de atributo). **Não é design puro** — precisa persistir |
| ⑨ | Skill enferrujada | ✅ 2026-08-02 | Precisa da coluna `last_xp_at` — `updated_at` não serve (ver §5.3) |
| ⑩ | Modo trégua | ✅ 2026-08-01 | `truce_periods` + `economy/truce.ts`, ligado em dano, streak e contra-ataque. A janela do boss **continua correndo** — [02 §5.11](./02-economia.md) |
| ⑪ | Ascensão | ⏳ **adiado** | Só depois do 1º ciclo anual completo — não dá para calibrar +20% de HP sem ter passado por 100% uma vez |
| ⑫ | Cicatrizes | ✅ 2026-08-02 | Escolha entre 2-3 trocas na morte; teto de 3 ativas; remover custa Essência |
| ⑬ | Preço que respira | ✅ 2026-08-02 | Preço em **dias**; recalibra a cada 15 dias sobre janela de 30, clamp ±15%; histórico + IA para itens abstratos |
| ⑭ | Eventos diários com escolha | ✅ 2026-07-30 | Módulo `events` · [02 §5.5](./02-economia.md) |
| ⑮ | Reputação por módulo | ✅ 2026-08-02 | Leitura agregada do ledger, sem migration. Reputação baixa **aumenta** o valor do retorno — nunca reduz |
| ⑯ | Retrospectiva narrada | ✅ 2026-08-02 | `narrative_beats.kind` é `text` — sem migration. Par natural do journaling (§4.15) |

### 11.4 Placar

## ✅ **O backlog está zerado.**

**29 de 30 itens executados** em quatro levas (2026-07-30, 07-31, 08-01 e 08-02/03).
O único que resta é **⑪ Ascensão**, adiado por decisão — depende de um ciclo anual
completo, não de escopo.

**A leva de 2026-08-02/03** fechou os 9 que sobravam, todos de servidor/web:
Reputação (⑮), Retrospectiva (⑯), Ferrugem (⑨), Cicatrizes (⑫), Limite de WIP (⑧),
Preço que respira (⑬), Bucket list (§4.13), Relacionamentos (§4.14) e Trabalho (§4.1) —
mais as **quatro regras da trégua** que a entrega de 08-01 não cobria.

#### As cinco decisões que divergiram do spec, e por quê

1. **Os eixos das cicatrizes mudaram.** O doc pedia "−5% HP máximo", "−10% crítico" e
   "−1 Vitalidade". `characters.max_hp` é **coluna gerada** (`50 + level × 10`) e não dá
   para reduzir sem reescrever a derivação inteira; crítico e atributos têm **dois**
   pontos de cálculo (HUD e combate) que o próprio código avisa que não podem divergir.
   Os quatro eixos que entraram — ouro, XP de hábito, dano recebido, dano no boss — têm
   **ponto único cada um** e dizem a mesma coisa.

2. **A duração mínima da trégua é de DURAÇÃO, não de aviso prévio.** O spec diz
   "declarada com antecedência, mínimo 3 dias", mas justifica com "sem mínimo vira escudo
   diário, acionado toda noite que você ia falhar" — que é sobre duração. Exigir aviso
   prévio tornaria impossível o caso que motivou a mecânica: acordar com febre.

3. **O slot de WIP só vem de boss trimestral para cima.** Um por mensal inflaria o teto em
   12 por ano e a mecânica perderia o sentido em oito meses.

4. **Relacionamentos entrou como `kind = 'meta'`**, não `atividade`. `atividade` o
   tornaria elegível a objetivo de boss, e "converse com 5 pessoas para ferir o boss" é
   exatamente a corrupção que o §4.14 manda evitar.

5. **O techSpace não tem autenticação server-to-server.** O doc supunha que a integração
   sairia sem tocar no sistema da empresa — e sai, mas por um caminho mais estreito:
   usuário robô com credenciais no `.env` e login automático. Junto vieram outros três
   atritos (sem tempo agregado, filtro de data sobre prazo, `userId` impuro) que o cliente
   absorve. Ver [04 §4.16](./04-modulos.md).

#### Uma armadilha que se repetiu quatro vezes

`xpMultipliers`/`goldMultipliers` **só funcionam no modo açúcar do `_grant`**. A nêmese
descobriu isso primeiro; reputação, ferrugem e cicatrizes teriam caído no mesmo buraco.
As quatro moram hoje no **centro do `_grant`**, e não nos chamadores — senão treino, sono,
medida, cardio e encontro (todos no modo raw) ficariam silenciosamente de fora.

Vale como regra: **efeito que precisa valer para todo módulo mora no `_grant`.**

#### O que a Essência deixou de ser

Órfã. Três destinos convergiram sem combinar: desbloquear sonho da bucket list, remover
cicatriz, e estender trégua além do orçamento.

---

#### Registro histórico do placar anterior

**15 de 30 itens executados** em três levas (2026-07-30, 2026-07-31 e 2026-08-01):
5 módulos, 9 mecânicas e 1 entrada automática (esta ainda dependendo do build iOS).

**A leva de 2026-08-01** foi a que dependia do celular, e saiu inteira numa build só:
Diário (§4.15), Nutrição (§4.3), Intenção × execução (⑦), Modo trégua (⑩) e a dívida das
notificações (§12). Junto foi o **enxugamento do app** — de 5 abas para 4, de ~14.200
para ~5.500 linhas de rota, com História/Boss, Loja, Personagem, Stats, Conquistas,
Skills e Histórico indo para o web ([08 §0](./08-navegacao-ux.md)).

**~~Sobrou aprovado e não iniciado (9)~~ — todos executados em 2026-08-02/03:** Trabalho (§4.1), Bucket list (§4.13),
Relacionamentos (§4.14), Limite de WIP (⑧), Skill enferrujada (⑨), Cicatrizes (⑫), Preço
que respira (⑬), Reputação (⑮) e Retrospectiva narrada (⑯). **Nenhum depende do
celular** — é uma leva de servidor/web.

**Triagem de 2026-07-31 (registro histórico):**
- ✅ **Aprovados (13):** Trabalho (§4.1), Nutrição (§4.3), Bucket list (§4.13),
  Relacionamentos (§4.14), Journaling (§4.15), Intenção × execução (⑦), Limite de WIP (⑧),
  Skill enferrujada (⑨), Modo trégua (⑩), Cicatrizes (⑫), Preço que respira (⑬),
  Reputação (⑮) e Retrospectiva narrada (⑯).
- ⏳ **Adiado:** Ascensão (⑪) — depende de um ciclo anual completo, não de escopo.
- ❌ **Descartados:** Finanças + Pluggy, Criação/output, Saúde clínica, Projetos pessoais,
  GitHub/GitLab, Google Calendar, Atalhos do iOS + NFC, Geofence.
- 🚧 **Dívida encontrada:** notificações (§12) — um bug real e um teto de arquitetura.

**O backlog está fechado.** Não sobrou item sem decisão — o que resta é executar,
esperar (Ascensão) ou nada (os descartados).

**Duas correções que a rodada de detalhamento produziu**, e que valem mais que qualquer
item novo porque evitariam bug silencioso:
- **⑨ não pode usar `updated_at`** — o trigger dispara em qualquer edição, então renomear
  uma skill parada a "reviveria". Precisa de `last_xp_at`.
- **⑧ não é design puro** — o teto sobe por recompensa de boss, logo tem de ser persistido
  e rastreável.

**⑩ Modo trégua continua sendo o único com prazo:** só é sentido no primeiro mês ruim, e
aí já é tarde.

**A Essência deixou de estar órfã:** três mecânicas aprovadas apontam para ela como
destino (bucket list, cicatrizes e trégua). O problema que ninguém tinha endereçado foi
resolvido de lado, por convergência.

> **Por que os dois aprovados se dão bem juntos:** os dois consertam buracos que já
> existem, em vez de abrir superfície nova. A bucket list dá destino à Essência e prêmio
> ao boss anual; a calibração explica *por que* as metas negociadas (③) precisam baixar.
> E nenhum dos dois exige toque diário novo — a declaração são 15 segundos de manhã, e a
> bucket list você abre uma vez por trimestre.

---

## 12. Notificações — diagnóstico de 2026-07-31 ✅ **resolvido em 2026-08-01**

Levantado pelo usuário: o app notifica hábito **já feito**, avisa **a cada 1 de ouro**
gasto em tela, e o texto é sempre o mesmo. São **duas causas diferentes**, e uma delas é
bug.

### 12.1 Notifica hábito já feito — é o teto da abordagem, não um bug

`features/notifications/scheduler.ts` agenda gatilhos **repetentes** (`DAILY`/`WEEKLY`)
do expo-notifications. Notificação local repetente dispara pelo **relógio do sistema** —
não tem como consultar estado no disparo, e o app pode estar fechado.

O snapshot (`GET /notifications/snapshot`) é buscado ao abrir o app e reprograma tudo,
mas reprograma o **mesmo conjunto estático**: "todo dia às 19h, lembrar de X". Fez X às
8h? A das 19h dispara igual.

### 12.2 Notifica a cada 1 de ouro — **é bug**

`ingest.service.ts:174` chama `AlertsService.afterCharge` **a cada lote de ingestão**, e
a extensão manda lote a cada ~1 minuto.

```ts
// alerts.service.ts:29-41 — caminho "Começou a cobrar"
await this.push.notify(userId, {...}, 0);   // ← intervalo mínimo ZERO
```

Enquanto o caminho "Queimando ouro" (linha 43) respeita `alert_interval_minutes`, o de
charge-start passa `0` e **não tem throttle nenhum**. Agravante: o gate é um único
`last_push_at` **compartilhado entre todos os tipos**, e como o charge-start sempre passa
**e ainda carimba** o campo, ele atrapalha o gate do outro alerta.

**Correções:**
1. Piso de intervalo no charge-start (10-15 min), nunca `0`
2. Deduplicar **por fonte e por dia** — "YouTube começou a cobrar" é uma vez por dia
3. Piso de valor: não avisar abaixo de ~10 de ouro (1 de ouro não é notícia)
4. Gate **por tipo** de alerta, não um `last_push_at` global

### 12.2b Cinco banners de uma vez — o problema que passou despercebido

`scheduleForHabit` agenda **uma notificação por hábito, por horário, por dia da semana**.

Com 5 hábitos marcados para 19:00, chegam **5 notificações simultâneas**. Não é uma
lista — são cinco banners empilhados.

Na prática isso pode ser o que mais irrita, e tem conserto **sem** migrar para push:
agrupar por horário e emitir uma só — *"3 hábitos pendentes às 19h"*.

### 12.3 Texto fixo

`content()` no scheduler é literal: `"Hora de: X"` / `"Registre e ganhe XP."` — igual para
todo hábito, todo dia.

### 12.4 A solução que resolve 12.1 e 12.3 de uma vez

**Mover lembrete de hábito de local para push server-side.**

A infra **já existe e já está em uso**: `push_tokens`, `PushService`, Expo push —
construídos para os alertas de tempo de tela; o app já registra o token toda sessão.

Um cron por faixa horária pergunta *"quem tem hábito pendente às 19h no fuso dele?"* e
manda **só para quem tem**. O servidor sabe o estado; o relógio do celular nunca vai saber.

E o texto passa a ter contexto, porque quem escreve tem os dados:
*"sua sequência de 12 dias morre hoje"*, *"faltam 2 dias para fechar a semana"*, *"se
falhar hoje o boss recupera HP"* — e, na camada narrativa, a IA em personagem (OpenRouter
camada 4 + boss ativo com nome e lore já existem). O lembrete deixa de ser alarme e vira
o boss cobrando.

> **Trade-off:** push exige rede e a API no ar. Isso já foi aceito quando os fechamentos
> diários saíram do `pg_cron` para o `@Cron` da API — o sistema já depende do servidor de
> pé às 03:05 UTC.

### 12.5 Inventário completo do que notifica hoje

| # | O quê | Canal | Gatilho | Configurável? |
|---|---|---|---|---|
| 1 | Lembrete de hábito | local | `DAILY`/`WEEKLY` fixo | ❌ só o horário no próprio hábito |
| 2 | Alerta corporal | local | `DAILY` 09:00 fixo | ❌ |
| 3 | "Começou a cobrar" | push | todo lote de ingestão | `notify_charge_start` |
| 4 | "Queimando ouro" | push | todo lote, gate de 30 min | `alert_interval_minutes` |
| 5 | Meta de foco atingida | desktop | fim da sessão | ❌ |
| 6 | Badge da barra de tarefas | desktop | hábitos pendentes | ❌ |

### 12.6 Os buracos de configuração

- **Nada é configurável fora do tracking.** `tracking_settings` tem `push_enabled`,
  `notify_charge_start` e `alert_interval_minutes`. Hábito e corpo não têm controle
  nenhum além de existir ou não.
- **Não há horário de silêncio.** Nada impede um banner às 23h50 ou às 6h.
- **Não há teto diário global.** Cada subsistema decide sozinho e ninguém conta o total —
  é assim que um app vira "aquele que grita".

### 12.7 Caminho proposto, em duas fases

**DECIDIDO em 2026-07-31: notificação passa a ser gerenciada pela API, com configuração
global no web.** Ou seja, vai direto para o modelo da Fase 2.

Isso **muda o valor da Fase 1**: não vale investir em agrupar notificação local se ela
vai sair de cena. Da Fase 1 sobrevive só o item independente:

**Correção imediata (independente da migração):**
1. Throttle do charge-start — piso de 10-15 min, dedupe por fonte e por dia, piso de
   valor. É bug, incomoda todo dia e não depende de nada do resto.

**O modelo novo (servidor):**
2. Lembrete de hábito vira **push por cron**, enviado **só para quem tem pendência** —
   acaba o "já fiz isso", que localmente não tem solução
3. **Agrupamento por horário** passa a ser trivial: o servidor monta uma mensagem só
   sabendo tudo que está pendente
4. **Texto contextual** e, depois, narrativo pela IA em personagem
5. **Tabela de preferências por tipo**, com tela no web: canal, horário, silêncio noturno
   e **teto diário global** — o que impede o app de virar "aquele que grita"

### 12.8 O que ficou de pé — implementado em 2026-08-01 ✅

O modelo do §12.7 saiu inteiro. O que existe hoje:

**API — módulo `notifications`** (`src/notifications/`):
- `notification_settings` (chave geral, silêncio noturno que atravessa a meia-noite,
  teto diário somando todos os tipos) e `notification_rules` (por tipo: `enabled` +
  lista de horários). Modelo em [06 §9.9](./06-dados.md).
- Cron a cada 5 minutos que resolve, **numa consulta só e no fuso de cada usuário**,
  quais regras têm horário batendo agora. Janela de tolerância de 5 min — dá para marcar
  19:07 se quiser.
- **Três portas antes de qualquer push:** a regra do tipo bateu · não é silêncio noturno
  · o teto diário não estourou. Só então a mensagem é **montada** — e se ela sair vazia,
  nada é enviado.

**O que cada tipo consulta antes de falar** (é aqui que o §12.1 morre):

| Tipo | Só fala se… |
|---|---|
| `habits` | há hábito positivo que vale hoje **e ainda não foi concluído** |
| `body` | treino ou medida parados além do limite de `body_alert_settings` |
| `nutrition` | há proposta esperando aprovação, ou nenhuma refeição no dia |
| `journal` | o dia ainda não tem entrada |

**Agrupamento** (o §12.2b): uma mensagem por tipo, com o resumo dentro —
"3 hábitos pendentes" em vez de três banners. E o texto ganhou contexto: quando a maior
sequência em risco tem ≥ 3 dias, a mensagem vira *"Sua sequência de 12 dias em X morre
hoje"*, que é um motivo e não um aviso.

**App:** `features/notifications/scheduler.ts` **foi apagado**. Sobrou registrar o token,
pedir permissão e — importante — **cancelar o que a versão anterior deixou agendado**,
senão quem já tem o app instalado receberia os alarmes locais antigos para sempre,
somados aos do servidor.

**Web:** `scheduler.ts` continua existindo (o desktop fica aberto o dia todo e mostra
notificação nativa), mas mudou de papel: ele **decide QUANDO, nunca O QUÊ**. Ao disparar,
pergunta ao servidor o que há a dizer naquele instante (`GET /notifications/due`); se a
resposta for vazia, nada aparece. Mais a tela de preferências em Configurações.

**Uma correção de escopo que apareceu no caminho:** o `PushService` conferia
`tracking_settings.push_enabled` — que é a chave do módulo de **tempo de tela**, não do
sistema. Desligar o push do tracking calaria também hábitos e diário. A chave geral agora
é `notification_settings.push_enabled`; o `AlertsService` continua conferindo a dele
antes de chamar.
