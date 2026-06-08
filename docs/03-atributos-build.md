# 03 — Atributos, Build, Equipamento e Classe

> **Dono de:** os 4 atributos fixos, como skills/partes do corpo/equipamento/pontos
> de boss compõem o atributo total, equipamento (slots, `required_level`), e a classe
> leve. Os **efeitos numéricos no combate** (quanto cada atributo causa/reduz) →
> [05-temporadas-boss](./05-temporadas-boss.md). Economia base → [02](./02-economia.md).
> Estado: 📋 projetado. Legenda: 🆕 novo/proposto (ajustável).

---

## 1. Os 4 atributos fixos 🆕

A lista de atributos é **fixa do sistema**. O que varia é o que VOCÊ aponta para cada
um (via skills e partes do corpo — §3). Cada atributo tem um papel **distinto** no
combate de boss (números em [05](./05-temporadas-boss.md)):

| Atributo | Papel no combate | Eixo |
|---|---|---|
| **Força** | + dano causado ao boss | ofensa |
| **Agilidade** | chance de **crítico** (×2 dano) + chance de **esquivar** o contra-ataque | crítico/evasão |
| **Vitalidade** | **reduz** o dano recebido do boss (armadura) | defesa |
| **Foco** | **explora a fraqueza** do boss: + dano no ponto fraco temático + revela info | sabedoria |

Split limpo: ofensa / crítico-evasão / defesa / sabedoria. Nenhum atributo é
"inútil" — cada um muda a batalha de um jeito diferente, então o build importa.
O Foco amarra com a **fraqueza temática** que a IA dá a cada boss (ver
[05 §3](./05-temporadas-boss.md) e [09](./09-narrativa-e-ia.md)): quanto mais Foco,
mais você lucra atacando pelo ponto fraco.

## 2. O atributo total

```
atributo_total(A) =
      Σ nível(skills mapeadas a A)
    + Σ nível(partes do corpo mapeadas a A)
    + Σ bônus de equipamento equipado em A
    + pontos permanentes de boss alocados em A
    + modificador de classe (§5)
```

Pontos importantes:
- **Contribuição de skills/partes usa o NÍVEL, não o XP.** É isso que finalmente dá
  função ao nível (resolve a "skill/parte decorativa" do diagnóstico em
  [00 §4](./00-visao.md)).
- **Só partes do corpo ATIVAS contam** (`is_active`); parte arquivada não soma.
- **Modificador de classe = `floor(subtotal × 15%)`** sobre a soma das outras
  parcelas (§5). É a **mesma regra** no HUD e no combate — o cálculo é fonte única
  e consistente (§7); a tela de build nunca diverge do que a luta usa.
- 🆕 **Curva:** começa linear (soma de níveis). Se inflar demais em playtest, aplicamos
  retornos decrescentes por contribuinte. O boss escala junto (ver [05](./05-temporadas-boss.md)),
  então atributo alto = vantagem, não trivialização.
- **Na morte hardcore:** as parcelas de skills e partes caem (XP delas zera → nível 1);
  as parcelas de **equipamento** (desequipado até reescalar) e **pontos de boss**
  permanecem. Nos modos seasonal/soft o build é preservado. Ver [02 §8](./02-economia.md).

## 3. Mapeamento skill / parte do corpo → atributo 🆕

Ao **criar** uma skill ou uma parte do corpo, você escolhe **1 atributo** que ela
representa. A lista de atributos é fixa; a associação é sua.

- Exemplos: "Disciplina" → Força · "Constância" → Agilidade · "Peito"/"Costas" →
  Vitalidade · "Estudo"/"Meditação" → Foco.
- É editável depois (mudar o atributo de uma skill recalcula as contribuições).
- Uma skill/parte aponta para **exatamente um** atributo (mantém simples e legível).
- Skills e partes do corpo continuam sendo entidades de domínio (XP próprio, criadas
  pelo usuário) — ver [04-modulos](./04-modulos.md); aqui só definimos como elas
  **alimentam** o build.

## 4. Equipamento 🆕

O melhor ralo de ouro **e** o melhor loot de boss (ver [00 §3](./00-visao.md)).

- **3 slots:** Arma · Armadura · Acessório. Um item por slot equipado.
- **Stats no item:** cada equipamento carrega bônus de atributo (ex.: +5 Força, +3
  Vitalidade). O slot é só posição; qualquer item pode dar qualquer atributo.
- **Possuído vs. equipado:** você possui vários; equipa um por slot.
- **`required_level`:** só equipa se `nível ≥ required_level` (ver [02 §8.1](./02-economia.md)).
  Amarrado ao tier de origem:
  - **Loja:** `required_level` **fixo por item** no catálogo (cada item já nasce com
    o seu, escalonado por tier — não é recalculado pelo seu nível atual).
  - **Drop de boss:** definido pelo tier que dropou — **mensal → 3 · trimestral → 10
    · semestral → 18 · anual → 28** (🆕 ajustável). Assim drops de tiers altos só
    re-equipam depois de reescalar após a morte hardcore.
- **Aquisição:** comprado com **ouro** (loja, `POST /store/equipment/:id/purchase`),
  comprado com **Essência** (itens especiais com `cost_essencia`,
  `POST /store/equipment/:id/purchase-essencia`), ou **dropado por boss** (loot —
  qualidade influenciada por Foco e desempenho na luta).
- **Morte:** possuído sempre sobrevive; na morte **hardcore** itens com
  `required_level > 1` desequipam pro inventário e são re-equipados ao reescalar.
  Ver [02 §8.1](./02-economia.md).
- Modelo de dados (`equipment`, `character_equipment`) → [06-dados](./06-dados.md).

## 5. Classe (versão leve) 🆕

Identidade passiva que **enviesa** o build — **sem** árvore de habilidades, **sem**
skills ativas (classe completa está fora de escopo, ver [00 §5](./00-visao.md)).

- Escolhida uma vez (1ª grátis); **respec** custa **50 de Essência** (🆕 ajustável).
- Efeito: **+15% no valor do atributo favorito** da classe, aplicado como
  `floor(subtotal × 0,15)` (🆕 ajustável). Pode espelhar seu foco real de vida:

| Classe | Atributo favorito | Perfil de vida |
|---|---|---|
| **Guerreiro** | Força | foco em treino/disciplina física |
| **Mago** | Foco | foco em estudo/mente |
| **Ladino** | Agilidade | foco em constância/streaks |

> Vitalidade não tem classe dedicada de propósito (é defesa pura; deixá-la sem bônus
> de classe evita um "tank" trivial). 🆕 reavaliar se quiser uma 4ª classe.

## 6. Pontos de atributo permanentes (de boss)

- Ganhos ao derrotar boss (ver [05](./05-temporadas-boss.md)); **sobrevivem à morte**
  (camada meta — [02 §8](./02-economia.md)).
- **Você aloca** cada ponto no atributo que quiser (build dirigido por você) —
  `POST /build/attribute-points/allocate`.
- **Sem portão de nível:** aplicam sempre; o freio é o HP baixo após a morte (glass
  cannon). Ver [02 §8.1](./02-economia.md).
- **Realocação (respec dos pontos)** custa **50 de Essência** (mesma moeda do respec
  de classe; 🆕 ajustável) — `POST /build/attribute-points/respec`. Devolve todos os
  pontos ao pool pendente para você realocar do zero. Sem nada alocado, é grátis.

## 7. Onde os números de combate moram

Este documento define **os valores** dos atributos (quanto você tem de cada). **Como**
esses valores viram dano/defesa/crítico/loot na luta — as fórmulas de combate — é dono
do [05-temporadas-boss](./05-temporadas-boss.md). Aqui só garantimos que o build é
calculado de forma única e consistente.

## 8. Decisões fechadas

1. ✔ **Curva de contribuição (§2):** começa **linear** (soma de níveis); retornos
   decrescentes só se inflar em playtest.
2. ✔ **Bônus de classe (§5):** **+15%** no atributo favorito, como `floor(subtotal ×
   0,15)` — regra única para HUD e combate (§2/§7).
3. ✔ **Vitalidade sem classe (§5):** não há classe de defesa; Vitalidade vem só de
   skills/partes/equipamento/pontos.
4. ✔ **Cálculo único (§2/§7):** um só conjunto de regras (nível, partes ativas, floor
   da classe) vale para a tela de build e para a luta — sem divergência.
5. ✔ **Portão de drop de boss (§4):** `required_level` por tier (3/10/18/28), em vez
   de fixo em 1 — o loot de boss respeita o portão de nível na morte.
6. ✔ **Aquisição por Essência (§4):** itens com `cost_essencia` compráveis via
   `purchase-essencia`.
7. ✔ **Respec de pontos (§6):** realocação dos pontos de boss por **50 de Essência**.
