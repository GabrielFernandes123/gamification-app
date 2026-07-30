# 02 — Economia (XP, Ouro, Nível, HP, Dano, Morte)

> **Dono de:** TODAS as fórmulas da economia base. Nenhum outro documento repete
> número — eles referenciam aqui (`ver 02-economia §X`).
> Atributos/equipamento/classe e seus efeitos de combate → [03](./03-atributos-build.md).
> Como cada módulo escolhe sua dificuldade → [04](./04-modulos.md).
> Dano do boss (com Vitalidade) → [05](./05-temporadas-boss.md).
> Núcleo `_grant` → [01 §4](./01-arquitetura.md). Estado: ✅ implementado (varredura 2026-08-04) — §5.1 a §5.18 todas no código.
> Legenda: ✅ herdado do sistema atual (testado) · 🆕 novo/proposto (ajustável).

---

## 1. Moedas

Duas moedas, com **fronteiras de ganho distintas** (ver [00 §6](./00-visao.md)):

| Moeda | Como se ganha | Onde se gasta |
|---|---|---|
| **Ouro** ✅ | Atividades do dia a dia (hábitos, treino, side quests, metas, dieta, finanças, foco) | Equipamento, consumíveis, recompensas reais pequenas/médias (loja `rewards`) |
| **Essência** 🆕 | **Somente derrotando boss** (ver [05](./05-temporadas-boss.md)). Nunca de atividade comum. | Recompensas reais grandes, cosméticos exclusivos, respec de build |

`_grant` pode creditar ouro em qualquer atividade; Essência **só** quando o
`source_type = 'boss'`.

## 2. XP e nível

✅ Fórmulas herdadas (mantidas — `level`/`max_hp` são colunas GENERATED no Postgres):

```
nível        = floor( sqrt(total_xp / 100) ) + 1
max_hp       = 50 + nível * 10
```

Mesma curva para **skills** e **partes do corpo** (cada uma com seu próprio `xp`):
`nível = floor(sqrt(xp / 100)) + 1`.

XP nunca fica negativo (piso 0).

## 3. HP e cura

- `current_hp` varia de 0 a `max_hp`. **0 = morte** (ver §8). ✅
- **Level-up cura cheia:** ao subir de nível, `current_hp = max_hp`. ✅
- Curas da loja (poções) restauram HP até o teto. ✅
- HP inicial do personagem novo: 60. ✅

## 4. Tabela de dificuldade — a âncora de tudo

✅ Toda recompensa do sistema parte desta tabela. **Princípio:** todo módulo ancora
suas recompensas aqui (não inventa escala própria) — inclusive o treino (🆕 mudança:
antes usava fórmula crua de volume; agora um treino vale "uma dificuldade", com o
volume modulando ±20%; o mapeamento treino→dificuldade fica em [04](./04-modulos.md)).

| Dificuldade | XP (dia completo) | Ouro (dia completo) | Fator de dano |
|---|---|---|---|
| Trivial | 10 | 4 | 5 |
| Fácil | 20 | 8 | 8 |
| Médio | 40 | 16 | 12 |
| Difícil | 80 | 32 | 18 |
| Épico | 150 | 64 | 28 |

> 🆕 **Ajuste de ouro (pós-playtest):** o ouro foi reduzido ~20% vs. o design
> original (era 5/10/20/40/75) para que equipamento e recompensas reais virem
> ralos de ouro de verdade. XP e fator de dano permanecem. Valores vivem em
> `difficulty_levels` (tunáveis no Studio).

## 5. Cálculo de recompensa por atividade (a matemática do `_grant`)

### 5.1 Modelo de DOIS NÍVEIS 🔄 (valor cheio por dia que conta)
Todo hábito tem **meta diária** (`executions_per_day`) + **meta de período EM DIAS**
(`weekly_target`/`monthly_target` = quantos dias completos/resistidos no período).

- **Dia "que conta"** = positivo com execuções ≥ meta diária (dia *completo*) ou
  negativo com recaídas < limite diário (dia *resistido*).
- **Base = valor CHEIO da dificuldade por dia que conta** — não se divide mais pelo
  alvo do período. (A regra antiga `XP / execuções_no_período` zerava os não-diários:
  um mês inteiro valia um único dia.) Médio = 40 XP por dia completo.
- **Dia parcial** (positivo incompleto): prêmio proporcional `valorDia × feito/meta`,
  liquidado no fechamento do dia.
- **Dia resistido** (negativo): prêmio proporcional à limpeza
  `valorDia × (1 − recaídas/limite)`.

**Overshoot** 🆕 (passar da meta, nos dois níveis — execuções no dia e dias no
período): cada unidade extra rende com retorno **decrescente** — 1º extra **100%**,
caindo 20pp por passo, **piso 20%**, e só até o **dobro da meta**. Não mexe no streak.
Ex.: água meta 8, bebeu 12 → 9º copo 100%, 10º 80%, 11º 60%, 12º 40%. Recompensa cheia
do dia cai **na hora em que a meta do dia é batida**; parciais/dano caem no fechamento.

### 5.2 A pilha de multiplicadores
O valor final aplica os multiplicadores **nesta ordem**, sobre o base:

```
xp_final   = xp_base   × (1 + bônus_streak_xp) × (1 + bônus_maestria)
ouro_final = ouro_base × (1 + bônus_streak_ouro)
```

- **Bônus de streak (XP)** ✅: `min(1.00, streak_atual × 0.05)` — +5%/dia, teto **+100%** (no streak 20).
- **Bônus de streak (ouro)** ✅: `min(0.50, floor(streak_atual / 7) × 0.10)` — +10% a cada 7 dias, teto **+50%** (no streak 35).
- **Bônus de maestria (XP)** 🆕: `min(0.50, nível_skill_primária × 0.01)` — +1% por nível da skill primária, teto **+50%**. É o que dá função ao nível da skill (resolve a "skill decorativa"). Não afeta ouro.

> Tetos existem de propósito: streak (+100% XP / +50% ouro) e maestria (+50% XP) somados dão no máximo ~3× o XP base — forte, mas não quebra a curva. 🆕 ajustável após playtest.

### 5.3 Distribuição para personagem, skills e partes do corpo ✅
Não é divisão — cada destino recebe seu valor:

```
personagem.total_xp += xp_final ;  personagem.gold += ouro_final
skill_primária.xp   += xp_final
skill_secundária.xp += floor(xp_final × 0.5)        # 50%
# (treino também distribui para partes do corpo, mesma regra 100%/50% — ver 04)
```

### 5.4 Sono ✅ 🆕 (2026-07-30)

Três critérios independentes, cada um ligável/desligável (ver [04 §4.9](./04-modulos.md)).
A recompensa é a **fração dos critérios ATIVOS cumpridos**, sobre a base da §4:

```
base       = difficulty_levels[config.difficulty]      # default 'easy'
razão      = critérios_cumpridos / critérios_ativos    # 1 quando nenhum está ativo
xp_final   = round(base.xp   × razão)
ouro_final = round(base.gold × razão)
```

Zero critérios cumpridos grava o evento com XP/ouro 0 — o registro continua existindo,
porque o histórico não pode ter buraco. **Nunca há dano** (§7 não se aplica ao sono).

### 5.5 Encontros diários ✅ 🆕 (2026-07-30)

A IA escreve o encontro; **os números são todos daqui** — o modelo devolve só o tipo de
efeito. Sem essa fronteira, uma alucinação vira inflação.

| Efeito | Valor | Teto |
|---|---|---|
| `gold` | sorteio determinístico por (evento, opção) | **5 a 40 de ouro** |
| `buff` | `damage_reduction` em `active_buffs` | **20%, por 12h** |
| `gamble` | 50% de chance de **2×** o `gold`, 50% de nada | mesmo teto do `gold` |

O sorteio usa semente estável por (evento, opção): reenviar a escolha não muda o valor,
e não dá para "rerolar" fechando e reabrindo a tela. `source_type: 'event'`, `kind: meta`.

### 5.6 Cardio ✅ 🆕 (2026-07-31)

Mesma sessão de treino, **modalidade** diferente ([04 §4.11](./04-modulos.md)). Só o
score muda; daí para frente é idêntico ao treino de força:

```
score_forca  = séries × 8 + volume_normalizado / 600      # inalterado
score_cardio = minutos × intensidade
intensidade  = clamp(0,8 … 1,2) de (FC_da_sessão ÷ sua_FC_mediana)
```

`intensidade = 1` (neutro) quando não há FC **ou** quando ainda não há 3 sessões com FC
para formar "o seu normal". Sem FC, conta só a duração.

Os minutos são os **cronometrados nos blocos**, com fallback no tempo decorrido da sessão.
A progressão vs. média recente do mesmo modelo continua valendo, comparando **duração**
em vez de volume. PRs não se aplicam (são de peso/reps).

> **Por que não usar zonas de FCmáx:** a fórmula clássica precisa da idade e erra por
> 10-20 bpm em quem treina. Comparar com a sua própria mediana responde a pergunta certa
> — "este foi mais forte que o seu normal?" — sem pedir dado que o sistema não tem.

### 5.7 Leitura ✅ 🆕 (2026-07-31)

Dois momentos, e **nenhum deles paga por unidade** — página não é moeda:

```
# sessão, obra COM total conhecido
fração    = unidades_avançadas / total_da_obra        # com teto diário, abaixo
xp_sessão = base(dificuldade) × FATOR_OBRA × fração   # FATOR_OBRA = 3

# sessão, obra SEM total (artigo, curso sem ementa)
xp_sessão = base('trivial')      # sem denominador não há proporção

# conclusão, uma vez só
xp_final += base(dificuldade)
```

`FATOR_OBRA = 3` faz a soma de todas as sessões valer ~3× a dificuldade da obra: ler um
livro inteiro em pedaços foi mais trabalho que uma side quest equivalente — mas continua
ancorado na tabela de dificuldade, não numa escala própria.

**Teto diário:** acima de **20% da obra num dia**, o excedente entra com a **mesma curva
de overshoot** do §5.1 (100/80/60/40, piso 20%). Maratonar continua valendo — só não vale
como se fossem cinco dias de leitura. Avanço é sempre positivo; corrigir para baixo é
edição da obra e não devolve XP.

### 5.8 Diário ✅ 🆕 (2026-08-01)

```
xp = base('trivial')          # uma vez, na PRIMEIRA gravação do dia
```

Fixo e trivial de propósito. Não é proporcional ao tamanho do texto, nem ao número de
mídias, nem ao humor registrado: pagar por volume premiaria escrever muito, e o que se
quer premiar é o hábito de registrar. Editar o texto à noite não rende de novo — o grant
só sai quando a linha do dia **nasce**.

### 5.9 Nutrição ✅ 🆕 (2026-08-01)

Duas recompensas, com unidades diferentes de propósito:

```
# 1. registrar uma refeição — na hora
xp_refeição = base('trivial')                      # fixo, por refeição

# 2. o DIA — no fechamento, mesma forma do Sono (§5.4)
ativos      = quantos critérios estão LIGADOS      # proteína ≥ X · kcal ≤ Y · N refeições
cumpridos   = quantos foram atendidos no dia
xp_dia      = base(dificuldade) × (cumpridos / ativos)
```

**Por que o dia é uma unidade separada da refeição:** proteína somada, calorias somadas e
número de refeições só existem no conjunto. Nenhuma refeição isolada significa alguma
coisa — almoçar 60 g de proteína é ótimo ou insuficiente dependendo do resto do dia.

Critério desligado sai do **denominador**, não conta como falha (idêntico ao Sono). Dia
sem nenhuma refeição **não fecha**: é ausência de dado, e fechar com zero marcaria
"kcal ≤ Y cumprido" para quem simplesmente não anotou.

**Nunca dano.** Comer demais de um item específico pode ser um hábito negativo, que já
tem dano próprio. O ato de comer, não.

Os macros vêm sempre da linha da `foods` escolhida — **nunca do corpo da requisição nem
do texto do modelo**. É a mesma disciplina dos encontros diários: a IA nomeia, o catálogo
numera.

### 5.10 Plano do dia ✅ 🆕 (2026-08-01)

```
erro = |previstos − realizados|

erro = 0  → base('easy')       # acertou na mosca
erro = 1  → base('trivial')    # chegou perto
erro ≥ 2  → nada
```

**Só bônus. Não existe caminho que tire XP, ouro ou HP.** Errar a previsão não custa
nada, e isso não é generosidade: punir imprecisão ensina a prever baixo para garantir o
acerto, que destrói exatamente o dado que se queria coletar. O `accuracy` fica guardado
como instrumento, não como julgamento.

### 5.11 Modo trégua ✅ 🆕 (2026-08-01) — o que ele NÃO muda

A trégua **não toca em recompensa nenhuma**: fazer as coisas durante ela rende igual. O
que sai é só o castigo — dano de hábito, zeragem de streak e contra-ataque do boss.

E **a janela do boss continua correndo**. Você descansa da punição, não do tempo:
congelar o prazo transformaria a trégua num botão de pausar o jogo quando ele fica
difícil, e um jogo que se pausa assim não cobra nada de ninguém.

### 5.12 Trabalho ✅ 🆕 (2026-08-03)

```
minutos = min(tempo medido no techSpace, 4h)          # teto por tarefa
minutos = min(minutos, 8h − já pago hoje)             # teto por dia
unidades = (minutos / 90) × prioridade                # LOW .8 · MED 1 · HIGH 1.1 · URG 1.2
xp = base('easy') × unidades

# sem cronômetro — NUNCA zero
unidades = 0,15 a 0,4 conforme a prioridade
```

**A unidade é TEMPO MEDIDO, não tarefa contada.** 30 tarefas de 20 min ≈ 3 de 3h:
esforço parecido, recompensa parecida. Contar tarefas trataria essas duas semanas como se
fossem 10× diferentes.

**O anti-farm sai de graça:** tarefa falsa criada e fechada rende **zero minutos**, e não
se falsifica cronômetro sem ficar sentado ali. É a defesa mais forte de qualquer módulo.

> ⚠️ **A calibração é a parte que importa.** 90 min ≈ um `easy` deixa um dia cheio (teto
> de 8h) valendo ~5 `easy` — mesma ordem de grandeza de um bom dia de hábitos + treino. Se
> o trabalho pagasse na régua do treino, 8h/dia virariam ~320 de XP e o ledger seria 80%
> trabalho; hábitos, corpo, leitura e sono virariam decoração.

> **Pagar por tempo premia trabalhar devagar?** O caso real não é trapaça, é esquecer o
> timer rodando. Três defesas: teto por tarefa, teto por dia, e XP só na **conclusão** —
> devagar adia a recompensa em vez de aumentá-la.

### 5.13 Bucket list ✅ 🆕 (2026-08-03)

```
realizar     → base('epic')          # a maior recompensa isolada do sistema
desbloquear  → GASTA Essência        # não paga nada; compra o direito de ir atrás
```

Realizar é a maior recompensa isolada, e deve ser: o boss anual paga por vencer um ano;
isto paga por **viver** uma coisa que você queria há anos.

Desbloquear ≠ realizar. Cobrar de novo na realização seria cobrar duas vezes pela mesma
coisa.

### 5.14 Relacionamentos ✅ 🆕 (2026-08-03)

```
contato comum         → base('trivial')   # 1× por pessoa por DIA
primeiro contato      → base('easy')      # a assimetria de valor
subir de estágio      → base('medium')    # paga como conclusão de meta
descer de estágio     → nada
```

**A assimetria é o que faz a construção acontecer:** o primeiro contato com alguém novo
vale mais que o 50º com alguém antigo. Sem isso o sistema premia só quem você já vê.

> ⚠️ **Subgamificar de propósito.** Nunca dano, nunca streak, sem objetivo de boss, sem
> Codex — e `kind = 'meta'` no registry justamente para não virar objetivo. "Converse com
> 5 pessoas para ferir o boss" é a corrupção que o módulo existe para evitar. A tela fala
> em tempo e pessoas, nunca em pontos.

### 5.15 Bônus do retorno (reputação ⑮) ✅ 🆕 (2026-08-03)

```
parado = dias desde o último evento do módulo − dias de trégua no período
parado < 7   → sem bônus
parado ≥ 7   → bônus = min(40%, 10% + (parado − 7) × 2%)
```

Aplicado a **XP e ouro**, no centro do `_grant`, junto da penalidade da nêmese — e pela
mesma razão: os multiplicadores só valem no modo açúcar, e treino, sono, medida, cardio e
encontro usam o modo raw.

> ⚠️ **Reputação baixa NUNCA reduz recompensa.** O impulso natural é o contrário, e é
> espiral de morte: abandonou cardio → cardio rende menos → abandona mais. Aqui a volta
> vale mais. Vira convite em vez de castigo, e ataca justamente o que a métrica mede.

**Sem tabela de controle:** por construção o bônus só acontece uma vez por silêncio — no
dia seguinte a recência é 1 e ele é zero.

### 5.16 Ferrugem de skill (⑨) ✅ 🆕 (2026-08-03)

```
parado = dias desde `last_xp_at` − dias de trégua no período
0-21   → maestria cheia
22-56  → fator = (56 − parado) / 35
>56    → dormente (bônus zero)

maestria = 1 + min(50%, nível × 1%) × fator
```

**O fator multiplica o BÔNUS, não o XP.** Skill dormente rende o valor base, nunca menos —
ferrugem tira o prêmio da dedicação, não a recompensa do esforço de hoje.

**Nível e XP nunca caem**, e a volta é **imediata e integral**: um evento restaura tudo. É
interruptor, não penitência proporcional ao abandono.

> ⚠️ `last_xp_at` existe porque `updated_at` **não serve** — o trigger dispara em qualquer
> edição, então renomear uma skill parada há três meses a "reviveria" sem nenhum XP.
> Verificado no banco: renomear mexe no `updated_at` e não no `last_xp_at`.

### 5.17 Cicatrizes (⑫) ✅ 🆕 (2026-08-03)

Quatro eixos, somados (não compostos) sobre as **ativas**:

| eixo | onde é aplicado |
|---|---|
| `goldPct` | `_grant`, ao lado da nêmese |
| `xpHabitPct` | `_grant`, só quando `sourceType = 'habit'` |
| `damageTakenPct` | `DamageService.applyDamage`, depois do buff de escudo |
| `bossDamagePct` | engine de boss, no dano **e** na cura de reversão |

Intensidade por modo de morte: `soft` 0,4× · `seasonal` 0,7× · `hardcore` 1,0×.
Teto de **3 ativas**; a 4ª empurra a mais antiga para inerte-mas-visível. Remover custa
**3 de Essência**.

> **Os eixos não são os do doc 14.** O spec pedia "−5% HP máximo", "−10% crítico" e
> "−1 Vitalidade". `characters.max_hp` é **coluna gerada** (`50 + level × 10`), e crítico e
> atributos têm **dois** pontos de cálculo (HUD e combate) que o próprio código avisa que
> não podem divergir. Os quatro eixos acima têm ponto único cada um, e dizem a mesma
> coisa: *mais frágil e mais ganancioso, ou mais lento e mais forte*.

### 5.18 Preço que respira (⑬) ✅ 🆕 (2026-08-03)

```
preço_em_ouro = dias_de_esforço × régua
régua = média diária de ouro GANHO nos últimos 30 dias
      com clamp de ±15% contra o ciclo anterior, recalculada a cada 15 dias
      piso de 5/dia
```

**Cadência ≠ janela**: recalcula a cada 15 dias, sempre sobre os últimos 30. Se a janela
encolhesse junto, uma semana de viagem derrubaria a média pela metade.

**Sem brecha para trapaça, por construção:** produzir menos barateia o item mas derruba
sua renda na mesma proporção — o tempo até conseguir comprar não muda.

**Escopo: só `category = 'recompensa'`.** Poção, buff e equipamento são balanceados contra
o jogo, não contra a sua vida — se o preço deles respirasse, nada teria valor fixo.

> ⚠️ **Armadilha de leitura:** preço em ouro subindo é notícia **boa** exibida como má.
> Significa que você produziu mais. A manchete do card tem de ser os **dias** (constantes),
> com o ouro como número derivado.

## 6. Streaks

Dois níveis (o segundo é 🆕):

- **Streak por hábito** ✅🔄: é **diário** em todos os agendamentos. No **fixo/diário**
  (`weekdays`) incrementa a cada dia cumprido (positivo) ou resistido (negativo) e
  zera no dia obrigatório perdido. No **flexível** (`weekly_count`/`monthly`), positivo
  incrementa quando o dia bate a meta diária; negativo incrementa quando o dia fecha
  resistido. Dias sem execução **não sobem** e **não zeram** enquanto ainda for possível
  cumprir a meta do período; zeram quando a margem acaba (positivo) ou quando o limite
  diário é estourado (negativo). Overshoot/extras não dão mais de +1 por dia. Campos:
  `current_streak`, `last_streak`, `best_streak`. Alimenta o bônus de §5.2.
- **Streak de personagem** 🆕: "dias consecutivos com ≥1 evento positivo no ledger". É o número de narrativa global do HUD. Lido direto do `economy_events`, não precisa de coluna nova. (Quebra: um dia sem nenhum evento positivo.)

## 7. Dano

### 7.1 Hábito positivo perdido 🔄 (liquidado no fechamento do DIA)
```
dano = ceil( dificuldade.fator_dano × proporção_faltante )   # teto: 80% do max_hp
```
- **Fixo/diário:** dia incompleto → dano acima + streak zera. Cada dia marcado é
  obrigatório, **sem tolerância**. Ex.: fez 2 de 10 (faltou 80%) num hábito difícil
  (fator 18) → ceil(18 × 0.8) = 15.
- **Flexível:** dia incompleto só toma dano e zera streak quando a **margem acabou** —
  i.e., quando nem completando todos os dias restantes dá pra bater a meta de dias do
  período. Até lá, dia incompleto rende só o prêmio parcial, **sem dano** e sem mexer
  no streak. Não há reset extra no fechamento do período.

### 7.2 Hábito negativo 🔄 (resistência premiada — dano imediato no dia)
Vale para **todo** agendamento (não é mais adiado p/ o fechamento do período):
- **Abaixo do limite:** sem dano (dia resistido → prêmio proporcional no fechamento).
- **Ao ATINGIR o limite:** dano cheio do dia `min(fator_dano, floor(max_hp × 0.8))`.
- **ALÉM do limite** (registro contínuo, sem teto de quantidade): dano **escalante** por
  recaída extra — base `fator_dano / limite`, **+20%/extra se limite = 1** (tolerância
  zero), **+10%/extra se limite ≥ 2**; teto 80% HP por golpe, acumula **até a morte**.
- **Período:** mede se a meta de dias foi batida para histórico/analytics; sem dano,
  recompensa ou incremento extra de streak.

### 7.3 Redução de dano (buff) ✅
Dano efetivo = `floor( dano × (1 − redução%/100) )`, da maior redução ativa em
`active_buffs` (ex.: Escudo Protetor, −50% por 7 dias).

> **Fronteira:** a redução por **Vitalidade/armadura** se aplica ao **dano do boss**,
> não ao dano de hábito perdido (manter as consequências da vida real reais).
> Regras de dano de combate → [05](./05-temporadas-boss.md).

## 8. Morte e reset

Gatilho: `current_hp <= 0` após dano — **de qualquer origem** (hábito positivo
perdido, negativo estourado **ou** contra-ataque de boss). A severidade é decidida
por um **modo de morte configurável** (`characters.death_mode`); a **camada de
meta-progressão sobrevive em todos os modos** (🆕 — mudança importante vs. o reset
total antigo). Fonte única de morte na API: `DeathService.applyDeath`.

**Três modos** (`death_mode`, padrão = `seasonal`):

| Modo | O que zera/perde | Streak de personagem | Portão (desequipa) |
|---|---|---|---|
| **`hardcore`** ✅🆕 | `total_xp→0` (**volta ao nível 1**), `gold→0`, `current_hp→60`, **XP de todas as skills→0**, **XP de todas as partes do corpo→0**, todos os `current_streak→0`, `death_count++` | →0 (reinicia) | sim (§8.1) |
| **`seasonal`** 🆕 (padrão) | `gold ×0.75`, `current_hp→ max(1, 35% do max_hp)`, `current_streak ×0.5` (hábitos), `death_count++` | preservado | não (mantém nível) |
| **`soft`** 🆕 | `gold ×0.90`, `current_hp→ max(1, 50% do max_hp)`, `death_count++` | preservado | não (mantém nível) |

A **camada Meta sobrevive em todos os modos**: **pontos de atributo permanentes**
(ganhos de boss), **Essência**, **equipamento possuído**, conquistas, bestiário/hall
de boss, **classe**.

> Por que o modo importa: só o `hardcore` devolve ao nível 1 — então só ele dispara
> o portão de nível (§8.1) e reinicia o streak de personagem (carimbando
> `last_reset_at`, que o cálculo do streak passa a respeitar). `seasonal`/`soft`
> mantêm nível, XP, skills e equipamento — são quedas que doem sem apagar o build.

**Interação crítica com atributos** (detalhe em [03](./03-atributos-build.md)): no
`hardcore`, como skills e partes do corpo zeram, a contribuição **delas** para os
atributos cai; mas os **pontos permanentes de boss + equipamento permanecem**. Ou
seja: a morte dói (você perde o build derivado de skills/corpo) mas mantém um **piso
permanente** conquistado nos bosses. Death é significativo, não devastador.

### 8.1 Portão de nível (o freio da meta-progressão) 🆕
Para a meta-progressão não anular o peso da morte, há **um único conceito de portão**:
todo **item de poder** (equipamento, comprado com ouro ou Essência) tem um
`required_level`. Você **possui** o item sempre (sobrevive à morte), mas só **equipa**
se `nível do personagem ≥ required_level`.

- **Na morte hardcore** (volta ao nível 1): itens com `required_level > 1`
  **desequipam automaticamente** para o inventário (não somem). Você **re-equipa
  conforme reescala**. Nos modos `seasonal`/`soft` o nível é mantido, então nada
  desequipa automaticamente.
- `required_level` é amarrado ao tier que dropou/vendeu o item (boss mensal → baixo;
  anual → alto). Detalhe em [03](./03-atributos-build.md) e [05](./05-temporadas-boss.md).
- **Sem portão:** a Essência em si (é só carteira), cosméticos e recompensas reais —
  nada disso afeta balanceamento, então não trava por nível.
- **Pontos de atributo permanentes:** sem portão. O freio natural é o **HP baixo do
  nível 1** (`50 + 1×10 = 60`) — após morrer você vira *glass cannon*: mantém os
  atributos, mas o corpo está frágil. Detalhe em [03](./03-atributos-build.md).

## 9. Resumo — a ordem que o `_grant` aplica

```
1. base = valor cheio da dificuldade por dia que conta (+ overshoot nos extras) (§5.1)
2. xp_final   = base.xp   × (1+streak_xp) × (1+maestria)   (§5.2)
   ouro_final = base.ouro × (1+streak_ouro)
3. grava economy_events                                (ledger)
4. personagem += ; skill_primária += ; skill_secundária += 50%
5. level-up? → cura cheia                              (§3)
6. (se source_type='boss') credita Essência           (§1)
7. conquistas + _sync_season
```

## 9.1 A regra do extrato ✅ 🆕 (auditoria de 2026-07-28)

**Todo movimento de moeda escreve em `economy_events`. Sem exceção.** A auditoria
encontrou quatro saídas que não escreviam: compra na loja (existia só em
`purchases`), respec de classe, respec de pontos e — a maior — a **morte**, que
confiscava ouro sem deixar linha nenhuma. Somando o ledger e as compras de um
perfil real, faltavam **453 de ouro** sem explicação: eram três mortes.

Fontes novas em `economy_source_type`: `store` (compras), `death` (morte e
recomeço manual) e `build` (respec). Todas com linha em `module_registry`
(`kind = 'meta'`) só para dar nome/cor/ícone à linha — não entram nos filtros de
módulo nem viram objetivo de boss. `achievement` ganhou a linha que faltava.

**E o HP tem o seu próprio extrato:** `character_damage_events` registra os dois
sentidos (`direction = 'loss' | 'gain'`) — golpe de hábito, contra-ataque e
marco do boss, e cura de item. O histórico devolve quatro tipos de linha:
`gain`, `fail`, `damage` e `heal`.

**Como se confere:** `saldo do personagem == soma dos gold_delta do ledger`. Se
divergir, existe um caminho gravando fora do livro — é bug, não arredondamento.

🆕 **2026-07-30:** entraram mais duas fontes sob a mesma regra — `sleep`
(`kind: atividade`) e `event` (`kind: meta`, os encontros diários). O ouro dos
encontros passa pelo `_grant` como qualquer outro, e não por um caminho próprio.

## 9.3 Penalidade da nêmese ✅ 🆕 (2026-07-31)

Enquanto houver **nêmese solta** (criatura com epíteto em `escapou`/`orfa` — só a 3ª fuga
dá epíteto), todo **ouro ganho** rende **15% menos**. É o custo de não caçar, e o que
transforma a nêmese de cosmético em dívida.

Aplicada **dentro do `_grant`**, depois do ouro calculado:

```
se ouro > 0 e há nêmese solta:  ouro = round(ouro × 0,85)
```

Três decisões que precisam estar escritas:

- **Não escala.** Duas nêmeses não dobram a perda — penalidade que cresce sozinha
  empurra para o abandono, o contrário do que a caçada quer provocar.
- **Só sobre ganho.** `gold > 0`. Em delta negativo daria desconto em compra e em morte.
- **XP intocado.** Ouro é o recurso de curto prazo; mexer em XP atrasaria nível e
  equipamento, punindo duas vezes pelo mesmo esquecimento.

> ⚠️ **Armadilha de implementação:** os `goldMultipliers` do `_grant` só valem no **modo
> açúcar**. Treino, sono, medidas e encontros usam o **modo raw** e os ignoram — passar a
> penalidade pelos chamadores deixaria metade do sistema de fora sem erro nenhum. Por isso
> ela é central, e vale para todo módulo presente e futuro.

O `meta` do evento registra `nemesisPenalty`. Sem isso a conciliação fecha mas o valor de
um evento isolado fica inexplicável — que foi exatamente como as três mortes silenciosas
passaram meses despercebidas.

## 9.2 Regularidade — métrica, ainda NÃO mecânica ✅ 🆕 (2026-07-30)

O streak é binário (47 dias ou zero) e não distingue quem produz 30 XP todo dia de
quem produz 210 num domingo — mesmo total, mesma leitura, embora a filosofia do
sistema seja que **constância vence**.

`/stats/overview` passou a devolver `regularity`: coeficiente de variação do XP
diário **com os dias parados incluídos** (é o zero que separa o distribuído do
concentrado), `score = round(100 × max(0, 1 − cv))`, mais `activeDays`,
`totalDays` e `topDayShare`.

> ⚠️ **Não entra em nenhuma fórmula de recompensa.** É leitura. Virar bônus muda a
> curva de XP e exige calibração com dado real — quando acontecer, a fórmula
> nasce aqui, no §5.

### 5.19 Negativo com agenda de período — o teto de recaídas ✅ 🆕 (2026-08-04)

Antes desta regra, `weekly_target`/`monthly_target` eram **gravados e nunca
lidos** em hábito negativo. A tela prometia uma mecânica que não existia, e a
promessa era invertida: "resistir 4 dias por semana" implica três dias
liberados.

**O novo significado:**

```
executions_per_day    = tolerância do DIA      (inalterado)
weekly/monthly_target = teto de dias com recaída no PERÍODO
```

**O que o teto compra.** Hoje, depois da primeira recaída da semana, não sobra
nada em jogo: a sequência zerou e os outros seis dias são eventos soltos —
terminar com 1 ou com 5 recaídas dá no mesmo. Com teto de 2, o deslize de
segunda deixa você em "1 de margem", e a semana continua tendo o que defender.

**A margem muda o PREÇO da recaída, não só o bônus do domingo.**

Na primeira versão o teto só decidia um bônus no fechamento — e recair custava
os mesmos 18 estando em 0, 1 ou 2. No momento da tentação, que é o único que
importa num hábito de evitar, a margem era **inerte**. Agora ela escala o golpe
do próprio dia:

```
dano = dano_do_dia × (1 + 0,5 × dias_além_do_teto)
```

| Recaída na semana (teto 2) | Dano |
|---|---|
| 1ª e 2ª | 18 — dentro da margem, inalterado |
| 3ª | 27 (+50%) |
| 4ª | 36 nominal → **cortado pelo teto do período** |
| 5ª em diante | 0 — teto já atingido |

**Isso não é punir duas vezes.** O golpe continua sendo UM SÓ, no dia do evento
— só que calibrado pela posição no período. Punir duas vezes seria um segundo
golpe no fechamento, e isso **segue proibido**.

**Teto do período: 80% do HP máximo** (`PERIOD_DAMAGE_CAP_RATIO`, espelhando o
teto que já existia por golpe). Sustenta uma regra que dá para dizer em voz
alta: *um hábito sozinho não te mata num período*. Sem ele, a semana de 4
recaídas somaria 99 num personagem de 100 de HP em hardcore — a semana ruim
viraria espiral, o oposto do desenho.

| Momento | O que acontece |
|---|---|
| Recaída dentro da margem | Dano cheio imediato (R2) |
| Recaída além da margem | Dano imediato **escalado**, respeitando o teto do período |
| Período dentro do teto | Bônus de um dia × `1 + streakXpBonus(sequência)` |
| Período estourado | Perde o bônus, zera a sequência. **Nunca um segundo golpe** |

> **A interface avisa ANTES do clique** — "Última da margem" e "Margem
> esgotada — a próxima custa +50%". Um escalonamento que a pessoa só descobre
> depois de recair não muda comportamento nenhum; vira surpresa desagradável.

**Bônus de ouro tem degrau próprio.** `streakGoldBonus` é `floor(dias/7) × 10%`
— desenhada em dias. Aplicada a uma sequência semanal viraria "7 SEMANAS por
+10%", 7× mais dura que o pretendido. `periodStreakGoldBonus` usa
`floor(períodos/4) × 10%`: o degrau vira o MÊS e o horizonte volta a bater com
o do XP (ambos no teto por volta de 20 semanas).

**Duas sequências, e elas convivem.** Cada uma mede o que sabe medir:

| Coluna | Unidade | Zera quando | Responde |
|---|---|---|---|
| `current_streak` | DIAS limpos | qualquer recaída | "como foi hoje" |
| `period_streak` | PERÍODOS no teto | estourar o teto | "como tem sido" |

A de dias é imediata e quebra fácil — em 25 dias de uso real nunca passou de 4,
porque zera a cada recaída. A de períodos é lenta e tolera um deslize: mede
**frequência**, que é onde a melhora aparece (2 → 2 → 4 → 0 recaídas por
semana).

> Uma primeira versão TROCOU a unidade de `current_streak` em vez de criar
> coluna nova, para não ter dois contadores competindo no mesmo card. Resolvia
> o ruído e custava o feedback diário — "hoje eu resisti" é informação legítima
> e ficou sem lugar. Revertido: colunas separadas, e **a recaída zera só a de
> dias**.

Cada uma tem seu bônus e sua curva: a diária paga no fechamento do dia com
`streakGoldBonus` (degrau de 7 dias); a de períodos paga no fechamento do
período com `periodStreakGoldBonus` (degrau de 4 períodos).

Fonte da regra: `habits/period-negative.ts` · fechamento em
`CloseService.closeNegativePeriod`.

> Na interface o número é **margem que se gasta**, nunca cota a que se tem
> direito: "2 recaídas de margem · faltam 3 dias", com a barra representando o
> que SOBRA. A moldura importa — num hábito de evitar, "0 de 2 usadas" lê como
> saldo disponível.

## 10. Decisões fechadas

1. ✔ **Maestria (§5.2):** +1% de XP por nível da skill primária, teto +50%.
2. ✔ **Morte (§8):** modo configurável `death_mode` (padrão `seasonal`), aplicado
   por **fonte única** independente da origem do dano (hábito ou boss). A camada
   meta (Essência, equipamento, pontos de atributo, classe) sobrevive em todos os
   modos; só o `hardcore` zera a camada run (XP/ouro/skills/streaks) e volta ao nível 1.
3. ✔ **Portão de nível (§8.1):** um único `required_level` nos itens de poder
   (equipamento, ouro ou Essência), com auto-desequipar **na morte hardcore** (que
   volta ao nível 1) e re-equipar ao subir. Essência/cosméticos/recompensas reais e
   pontos de atributo: sem portão.
4. ✔ **Vitalidade (§7.3):** reduz só dano de boss, não o dano de furar hábito.
5. ✔ **Ajuste de ouro (§4):** ouro da tabela reduzido ~20% (5/10/20/40/75 →
   4/8/16/32/64) para tornar equipamento e recompensas ralos reais de ouro.
