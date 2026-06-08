# 05 — Temporadas e Boss

> **Dono de:** temporadas, tiers e evolução dos bosses, fórmulas de combate (usando
> os atributos), contra-ataque, objetivos cross-module, geração via IA, e recompensas.
> Atributos (valores) → [03](./03-atributos-build.md). Economia base (XP/dano/morte/
> meta diária) → [02](./02-economia.md). Módulos/registry → [04](./04-modulos.md).
> `_grant`/`_sync_season`/OpenRouter → [01](./01-arquitetura.md). Dados → [06](./06-dados.md).
> Estado: 📋 projetado. Legenda: 🆕 número/regra ajustável após playtest.
>
> **Filosofia de calibração (norteia todos os números):** boss **mensal** deve ser
> vencível se você foi **consistente** (premia constância, não grind extra); tiers
> **longos** exigem consistência **sustentada** + estratégia de build.

---

## 1. Conceito

Uma **Temporada** é uma janela de tempo com um **Boss** que tem HP. É uma **camada por
cima de todos os módulos** (não é um módulo — ver [00 §3](./00-visao.md)): você "ataca"
o boss agindo nos módulos, e o boss "ataca de volta" quando você falha. É o objetivo
macro que faz tudo convergir e resolve o "late-game sem propósito" do diagnóstico.

## 2. Tiers e evolução

Quatro tiers rodam **em paralelo** (você sempre tem um mensal ativo; pode ter
trimestral/semestral/anual simultâneos):

| Tier | Janela | Papel | Modelo de dano |
|---|---|---|---|
| **Miniboss** | mensal | dopamina recorrente; temático e adaptativo | **dano contínuo** (atividade diária) |
| **Boss** | trimestral | arco médio | **dano por marcos** + fases |
| **Raid Boss** | semestral | arco longo | **dano por marcos** + fases |
| **World Boss** | anual | o grande objetivo do ano; recompensa lendária | **dano por marcos** + fases |

### 2.1 O problema dos tiers longos e a solução (evolução por fases) 🆕
Se um boss longo tivesse HP fixo e tomasse o dano diário contínuo, ele morreria cedo
demais (no fim do mês 1 já teria levado dano de 3 meses). Solução:

- Bosses longos **não tomam dano do XP diário contínuo.** Tomam dano de **marcos**:
  conclusão de **objetivos** (§5) + uso de **cargas** ganhas ao vencer os minibosses
  mensais ([§7](#7-recompensas) — vitórias pequenas viram munição nas grandes).
- O boss tem **uma fase por mês**. Cada fase tem seu próprio pool de HP e seus
  objetivos; você só danifica a **fase atual**. Ao zerá-la, a próxima abre no mês
  seguinte. Assim o dano é **pausado por mês** e o boss **evolui** (ganha objetivos
  novos, muda de comportamento).
- A cada fase, o HP/objetivos podem **escalar com o seu build atual** (que cresceu) —
  o boss acompanha sua evolução. Recalibrado na geração (§6).

> ✅ **Implementado** (`BossEngineService`): nº de fases = meses da janela (tri 3 ·
> sem 6 · anual 12; mensal 1). HP total dividido igualmente entre as fases. A fase do
> mês é **time-gated** (`boss_phases.unlock_on`): você só fere a fase atual; ao zerá-la
> (status `vencida`) a próxima só abre no 1º dia do mês seguinte — se zerar cedo, o dano
> fica **pausado** até lá. Longos **não** tomam dano contínuo de XP; só **marcos**
> (objetivos da fase) + **cargas** (§7). Objetivos da próxima fase são semeados quando
> ela abre (escalam com o build do mês). Mensal segue com dano contínuo numa fase só.

## 3. Combate — fórmulas

Usa os atributos do [03](./03-atributos-build.md). Constantes (`k*`, `cap*`) são 🆕
ajustáveis.

### 3.1 Dano do jogador no boss
```
dano_no_boss = dano_base × (1 + Força × kF) × mult_crítico × (1 + bônus_fraqueza)
```
- **`dano_base`:** no **mensal** = o XP positivo do dia (do ledger); nos **longos** =
  o valor de dano do objetivo/carga concluído.
- **Força:** `kF = 0.01` (cada ponto de Força → +1% de dano). 🆕
- **Crítico (Agilidade):** chance `= min(0.50, Agilidade × 0.005)`; se crítico, dano ×2. 🆕
- **Bônus de fraqueza (Foco):** se o dano vem do **módulo fraco** do boss (a fraqueza
  temática que a IA define — ver [09](./09-narrativa-e-ia.md)), aplica
  `bônus_fraqueza = fraqueza_base × (1 + Foco × kFoco)`. Foco amplia o quanto você lucra
  atacando pelo ponto fraco; `fraqueza_base` ex.: 0.5 e `kFoco = 0.01`. 🆕 Fora da
  fraqueza, `bônus_fraqueza = 0`.

### 3.2 Contra-ataque do boss (dá função à meta diária)
Hoje `daily_xp_goal` é decorativa ([02 §10](./02-economia.md) histórico). Agora: **se
você não bate a meta diária**, no fechamento o boss te ataca.
```
dano_recebido = ataque_boss × (1 − redução_Vitalidade)      # se não esquivar
```
- **`ataque_boss`:** fração do seu `max_hp`, escalada pelo tier — sempre relevante,
  nunca one-shot. ✅ Implementado: **mensal 10% · trimestral 12% · semestral 15% ·
  anual 18%** (mín. 6), e o enrave de fase (§3.5) sobe +8% por limiar cruzado. 🆕
- **Redução (Vitalidade):** `= min(0.75, Vitalidade × 0.01)`. 🆕 (Só aqui — não reduz
  dano de hábito perdido, ver [02 §7.3](./02-economia.md).)
- **Esquiva (Agilidade):** chance `= min(0.50, Agilidade × 0.005)`; se esquiva, dano = 0. 🆕
- O contra-ataque pode **levar à morte** (HP→0) pelas regras de [02 §8](./02-economia.md).

### 3.3 Foco → sabedoria (explorar a fraqueza)
Foco governa **como você luta**, não o que ganha:
- **Dano no ponto fraco:** amplia o `bônus_fraqueza` de §3.1 — atacar pelo módulo fraco
  do boss rende mais quanto mais Foco. 🆕
- **Revela informação:** com Foco suficiente, a UI mostra HP exato do boss, qual é a
  fraqueza e o ritmo esperado (sem Foco, a informação é vaga). 🆕

### 3.4 HP do boss (calibração)
**Alvo (filosofia):** o jogo **na média** deve vencer o boss **perto do fim** da janela
(≈ dia 26–29 no mensal), **nunca cedo demais**.
- **Mensal:** `hp ≈ produção_esperada_do_mês × 0.95` 🆕 (produção esperada = média de XP
  diário positivo recente × dias). Ou seja, dimensionado para a **produção cheia** — um
  mês fraco não vence (essa é a tensão); um mês consistente vence no fim, não no dia 18.
- **Longos:** soma dos HPs das fases; cada fase calibrada para ~1 mês de marcos.
- Recalculado na geração com base no seu build/output atuais (o boss escala junto).

### 3.5 Fases / enrage
Aos **75% / 50% / 25%** de HP (da fase atual), o boss muda: pode desbloquear objetivos
novos ou aumentar o contra-ataque. 🆕

> ✅ Implementado: cada limiar cruzado (uma vez, via `boss_phases.enrage_stage`) sobe o
> `ataque_boss` em **×1.08** e gera um beat de enrave. (Desbloquear objetivos novos no
> meio da fase fica como evolução futura — hoje os objetivos novos vêm a cada **fase**.)

### 3.6 Recalibração anti-"front-load" 🆕
Para você não matar o boss cedo demais acelerando no início, há um **checkpoint** (≈ dia
15; checagens leves a cada 7–10 dias):
- Compara **dano causado vs. ritmo esperado** (esperado no dia D ≈ `(D / dias_totais) × hp`).
- Se você está **muito à frente** (ex.: > ~55–60% no dia 15), o boss **enraivece**: ganha
  HP (cura), com **teto** (não vira esteira infinita). No ritmo → nada muda.
- O enrave vem acompanhado de um **beat de história** (a recalibração é dona do
  [09-narrativa-e-ia](./09-narrativa-e-ia.md), que a faz parecer trama, não truque).
- Efeito: praticamente impossível vencer antes do ~dia 20, pois acelerar dispara o enrave.

## 4. Estados da temporada

`ativa` → `vencida` (HP do boss zerado no prazo) | `perdida` (prazo acabou com boss
vivo). **Derrota = você perde o prêmio daquela temporada** (é o que faz a recompensa
importar — sem stakes, nada importa). **Sem reset brutal** — a tensão vive na
temporada, que é recuperável (isto também é o que suaviza a morte hardcore).

## 5. Objetivos cross-module

Cada temporada tem **5–8 objetivos** puxados dos **módulos ativos** (lidos do
`module_registry` — [04 §2](./04-modulos.md)), então só aparecem módulos em escopo
(Dieta/Finanças/Foco entram sozinhos quando forem ativados, sem tocar aqui).

- Exemplos (escopo atual): "complete 12 treinos", "mantenha streak 21 em qualquer
  hábito", "registre 8 medidas", "conclua 5 side quests", "suba 2 níveis numa skill".
- Cada objetivo concluído = **bloco de dano no boss** (nos longos é a principal fonte
  de dano — §2.1) + recompensa.
- **Progresso** atualizado por `_sync_season` após cada `_grant` (lê o ledger por
  `source_type` — [01 §4](./01-arquitetura.md)). Marcos disparam o dano por objetivo.

## 6. Geração via IA, arco narrativo e recalibração

Como o boss tem **fraqueza temática**, **lore conectada entre tiers**, **3 camadas de
IA** e **recalibração narrativa**, tudo isso é dono do documento dedicado
**[09-narrativa-e-ia](./09-narrativa-e-ia.md)**. Em resumo, o que toca este doc:
- A **engine determinística** define os NÚMEROS (HP §3.4, objetivos §5, `ataque_boss`
  §3.2, recalibração §3.6) com **clamp** — a IA nunca decide balanceamento.
- A **fraqueza temática** do boss (módulo fraco) entra no `bônus_fraqueza` de §3.1.
- A **personalização** da temporada (semente, presets, duração) e a **tela da história**
  ficam no [09](./09-narrativa-e-ia.md).

## 7. Recompensas

O coração da vontade de jogar. **Regra:** a recompensa só importa porque a **derrota é
possível** (§4).

### 7.1 As 5 camadas
1. **Pontos de atributo permanentes** *(backbone)* — você aloca; **sobrevivem à morte**
   ([02 §8](./02-economia.md), [03 §6](./03-atributos-build.md)). É a curva de poder de
   longo prazo: sua consistência real molda o personagem ao longo do ano.
2. **Cosmético / bestiário** — títulos, molduras, e um **hall de boss** que você
   preenche ao derrotar cada um (coleção + status).
3. **Essência** — moeda rara, **só de boss** ([02 §1](./02-economia.md)).
4. **Recompensa da vida real** *(gancho central)* — dois caminhos que coexistem:
   - **desbloqueio direto:** vencer o boss anual libera *aquela* recompensa real que
     você amarrou à temporada;
   - **Essência acumulada:** junta de vários bosses e gasta num catálogo de recompensas
     especiais. (Reusa a loja `rewards` — [04 §4.7](./04-modulos.md).)
5. **Lore** — cada boss tem história; vencer fecha um capítulo (preenche o bestiário).

### 7.2 Loot por desempenho
A qualidade do drop escala com **como** você venceu: margem de tempo, **sem morrer**,
**todos os objetivos** cumpridos → drop melhor. Transforma "só vencer" em "vencer bem".
(Foco **não** governa loot — Foco é sabedoria/combate, §3.3.)

> ✅ Implementado: bônus do drop = base por tier + roll determinístico **+ desempenho**
> = `round(% de objetivos × 3) + (venceu antes do prazo ? 1) + (sem morrer na janela ? 1)`.
> "Sem morte" compara `death_count` no início vs. no fim da janela; margem compara a data
> da vitória com `window_end`.

### 7.3 Escala por tier 🆕
| Tier | Pontos de atributo | Essência | Cosmético | Recompensa real | Cargas p/ tier maior |
|---|---|---|---|---|---|
| Mensal | +1 | pouca | moldura comum | — | ✔ (munição) |
| Trimestral | +3 | média | título | média | ✔ |
| Semestral | +4 | alta | título raro | grande | ✔ |
| Anual | +5 e slot de build | muita | troféu lendário | **a grande** (desbloqueio direto) | — |

> ✅ Implementado: pontos de atributo/Essência por tier = **1 / 3 / 4 / 5**. As **cargas**
> ganhas ao vencer um boss vão para a temporada do **boss-pai** (tier acima) — o anual
> não tem pai, então não gera carga. Você as gasta na **fase atual** do boss longo via
> `POST /seasons/boss/spend-charges` (`{tier, amount}`): cada carga tira **10%** do HP da
> fase ativa. O mensal não usa cargas (toma dano contínuo). 🆕 frações ajustáveis.

## 8. Como tudo se amarra (visão de ciclo)

```
atividade nos módulos ─→ _grant ─→ ledger ─┬─→ dano no boss mensal (contínuo)
                                            ├─→ progresso de objetivos (marcos)
                                            └─→ streak/maestria/atributos (build)
build (atributos) ─→ modula dano/crítico/defesa/loot na batalha
falhar meta diária ─→ contra-ataque do boss ─→ HP/morte
vencer boss ─→ pontos de atributo (perm.) + Essência + cosmético + recompensa real
            └─→ cargas que viram munição nos bosses maiores
```

## 9. Decisões fechadas

1. ✔ **Foco (§3.1/§3.3):** Sabedoria — amplia dano no ponto fraco do boss + revela info.
2. ✔ **Dificuldade (§3.4/§3.6):** HP ≈ produção esperada cheia (mirar dia ~26–29) +
   recalibração com enrave narrativo (com teto) se à frente do ritmo.
3. ✔ **Estrutura aninhada conectada** (12→4→2→1 e presets menores) — detalhe em
   [09](./09-narrativa-e-ia.md).
4. ✔ **Constantes de combate (§3):** valores atuais são ponto de partida para ajuste em
   playtest.
5. ✔ **Fases mensais implementadas (§2.1/§3.5):** longos têm uma fase por mês
   (time-gated), tomam só marcos + cargas (sem dano contínuo), com enrave por limiar de HP.
6. ✔ **Cargas como munição (§2.1/§7, 09 §2):** creditadas ao tier-pai ao vencer o menor;
   gastas na fase atual do boss longo (`spend-charges`). Mensal não usa.
7. ✔ **Loot por desempenho (§7.2)** e **recompensas por tier 1/3/4/5 (§7.3)** implementados.

> Em aberto para validar quando for implementar (não trava o design): **`ataque_boss`
> pode levar à morte?** (proposta: sim, mas com `ataque_boss` em fração baixa do HP, a
> morte por boss é rara e fruto de descuido prolongado, não de um golpe). Confirmar no
> playtest.
