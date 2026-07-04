# 04 — Módulos e o Contrato de Módulo

> **Dono de:** o contrato que todo módulo cumpre, o `module_registry`, e a ficha de
> cada módulo (o que recompensa, qual `source_type`, o que alimenta). Fórmulas →
> [02](./02-economia.md). Build/atributos → [03](./03-atributos-build.md). Boss →
> [05](./05-temporadas-boss.md). Dados → [06](./06-dados.md). Estado: 📋 projetado.
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

### 4.6 Módulos futuros (FORA do escopo atual) 🆕📋
**Decisão:** Dieta, Finanças e Foco **não entram agora** — o foco é deixar os módulos
existentes coerentes + a camada de núcleo/atributos/boss. Ficam documentados como
futuros porque a arquitetura plugável ([§1](#1-o-contrato-de-módulo)) já os suporta:
quando entrarem, é só tabelas de domínio + `_grant` + linha no `module_registry`,
**sem retrabalho** no resto do sistema. Esboço para quando voltarem:
- **Dieta** (`diet`, tipo-hábito): reusa o motor de hábitos; conecta com medidas.
- **Finanças** (`finance`, tipo-evento): sinergia com a economia de ouro.
- **Foco** (`focus`, tipo-evento): timer Pomodoro manual (contorna limitação do iOS).

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

Todos os 5 são `source_type`s de **atividade** (`kind: atividade` no registry) e, por
isso, elegíveis a objetivos de boss (05). `kind: meta` fica para a camada meta
(Conquistas, Boss) — ver §4.8.

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
