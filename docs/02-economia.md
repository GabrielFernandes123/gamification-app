# 02 — Economia (XP, Ouro, Nível, HP, Dano, Morte)

> **Dono de:** TODAS as fórmulas da economia base. Nenhum outro documento repete
> número — eles referenciam aqui (`ver 02-economia §X`).
> Atributos/equipamento/classe e seus efeitos de combate → [03](./03-atributos-build.md).
> Como cada módulo escolhe sua dificuldade → [04](./04-modulos.md).
> Dano do boss (com Vitalidade) → [05](./05-temporadas-boss.md).
> Núcleo `_grant` → [01 §4](./01-arquitetura.md). Estado: 📋 projetado.
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

## 6. Streaks

Dois níveis (o segundo é 🆕):

- **Streak por hábito** ✅🔄: no **fixo/diário** (`weekdays`) incrementa a cada **dia** cumprido (positivo) ou resistido (negativo); no **flexível** (`weekly_count`/`monthly`) incrementa quando a **meta de dias do período** é batida (no fechamento de período). Reseta a 0 no dia perdido (fixo) ou no período não-batido (flexível). Overshoot não afeta. Campos: `current_streak`, `last_streak`, `best_streak`. Alimenta o bônus de §5.2.
- **Streak de personagem** 🆕: "dias consecutivos com ≥1 evento positivo no ledger". É o número de narrativa global do HUD. Lido direto do `economy_events`, não precisa de coluna nova. (Quebra: um dia sem nenhum evento positivo.)

## 7. Dano

### 7.1 Hábito positivo perdido 🔄 (liquidado no fechamento do DIA)
```
dano = ceil( dificuldade.fator_dano × proporção_faltante )   # teto: 80% do max_hp
```
- **Fixo/diário:** dia incompleto → dano acima + streak zera. Cada dia marcado é
  obrigatório, **sem tolerância**. Ex.: fez 2 de 10 (faltou 80%) num hábito difícil
  (fator 18) → ceil(18 × 0.8) = 15.
- **Flexível:** dia incompleto só toma dano quando a **margem acabou** — i.e., quando
  nem completando todos os dias restantes dá pra bater a meta de dias do período. Até
  lá, dia incompleto rende só o prêmio parcial, **sem dano**. Não bater o período =
  streak zera (sem dano extra — o dano já foi cobrado por dia).

### 7.2 Hábito negativo 🔄 (resistência premiada — dano imediato no dia)
Vale para **todo** agendamento (não é mais adiado p/ o fechamento do período):
- **Abaixo do limite:** sem dano (dia resistido → prêmio proporcional no fechamento).
- **Ao ATINGIR o limite:** dano cheio do dia `min(fator_dano, floor(max_hp × 0.8))`.
- **ALÉM do limite** (registro contínuo, sem teto de quantidade): dano **escalante** por
  recaída extra — base `fator_dano / limite`, **+20%/extra se limite = 1** (tolerância
  zero), **+10%/extra se limite ≥ 2**; teto 80% HP por golpe, acumula **até a morte**.
- **Período:** só ajusta o streak (resistiu ≥ meta de dias?); sem dano/recompensa extra.

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
