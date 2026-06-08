# 09 — Narrativa e IA (Arco da Temporada, Geração, Recalibração)

> **Dono de:** o arco narrativo da temporada, a hierarquia conectada dos bosses, as 3
> camadas de geração por IA, a recalibração narrativa, a tela da história e a
> personalização/configuração da temporada.
> Combate e números → [05-temporadas-boss](./05-temporadas-boss.md). Atributos (Foco/
> fraqueza) → [03](./03-atributos-build.md). OpenRouter/jobs → [01](./01-arquitetura.md).
> Dados → [06](./06-dados.md). Estado: 📋 projetado. Legenda: 🆕 ajustável · 📋 futuro.

---

## 1. Conceito: a Temporada é um arco narrativo

Uma **Temporada** é um **arco com uma lore própria** (default: 1 ano; configurável —
§6). Os bosses dos tiers ([05 §2](./05-temporadas-boss.md)) são **capítulos conectados**
desse mesmo arco — não bosses avulsos. Ano novo (ou arco novo) = nova lore.

A barra de HP vira **jornada**: você acompanha uma história que se desenrola conforme
você age na vida real.

## 2. Hierarquia conectada dos bosses

Os tiers são **aninhados e narrativamente ligados** (exemplo do arco anual completo):

```
1 Boss ANUAL  (vilão final do arco)
 ├─ 2 SEMESTRAIS  (ex.: os dois "generais")
 │   ├─ 4 TRIMESTRAIS  (tenentes)
 │   │   └─ 12 MENSAIS  (capangas / aspectos)
```

- **Conexão narrativa + mecânica:** vencer um boss menor gera **"cargas"** que
  **enfraquecem** o maior (munição contra o tier superior — [05 §2.1/§7.3](./05-temporadas-boss.md)),
  com sentido de trama ("derrotar o capanga te deu vantagem sobre o general").
- O ano inteiro é **uma história fechada**.

> ✅ Implementado: ao vencer um boss, as cargas são creditadas à **temporada do
> boss-pai** (tier acima) via `parent_boss_id`; você as **gasta** para ferir a fase
> atual do boss maior (`POST /seasons/boss/spend-charges`). É assim que "vencer o menor
> enfraquece o maior" acontece mecanicamente. O anual (sem pai) não gera carga.

## 3. As camadas de geração por IA (4 camadas · 3 níveis de modelo)

Separação por frequência, consequência e custo (via OpenRouter — modelo por camada,
configurável, [01 §9](./01-arquitetura.md)). Como é uso pessoal (1 usuário), a narração
pode rodar bastante a custo baixo.

| Camada | O que faz | Frequência | Modelo |
|---|---|---|---|
| **1 — Esqueleto do arco** | lore da temporada + elenco de bosses + conexões + **identidade/tema** de cada boss (FIXO) | 1×/temporada | **super forte** |
| **2 — Ajuste inicial do boss** | NÚMEROS do boss (HP/fases/objetivos/`ataque_boss`) **e a fraqueza mecânica** (módulo + bônus) | ao **abrir a janela** do tier (mensal, trimestral…) | **super forte** |
| **3 — Recalibração intermediária** | checa ritmo e aplica **enrave** (ajusta números, com teto) | **quinzenal** (~dia 15) + checagens | **médio** |
| **4 — Narração / lore** | escreve a história do SEU combate e tece os beats (inclui o enrave) | **frequente** (ex.: a cada 2–3 dias) | **leve** |

### Detalhes
- **Camada 1 (esqueleto):** torna a história **coerente e fechada**. Define só a
  *narrativa* (quem são os bosses, como se ligam, o tema de cada um) — **não** fixa
  números nem a fraqueza mecânica.
- **Camada 2 (ajuste inicial):** quando a vez de um boss chega, define os números com
  **esqueleto + seus dados reais recentes** (ledger, build); a **engine determinística
  clampa** em faixas seguras ([05 §6](./05-temporadas-boss.md)). A IA propõe; a engine
  decide o balanço.

  > ✅ Implementado hoje: **a engine decide 100%** dos números, fases e da **fraqueza**
  > (= módulo negligenciado nos últimos 14 dias, em `ensureCurrentBoss`) — é o caminho
  > "fallback sem IA", que é o padrão e o piso de segurança. A IA da Camada 2 hoje só
  > gera **texto de sabor** ("o inimigo se revela"); o laço "IA propõe número → engine
  > clampa" fica como evolução futura. O balanço nunca depende da IA.
- **Camada 3 (recalibração):** modelo médio porque mexe em **números** (mais
  consequente que texto). Detalhe em §4.
- **Camada 4 (narração):** modelo leve, roda muito; é a camada de **imersão**. Narra o
  enrave que a Camada 3 disparou.

> **Por que esqueleto fixo + números/narração dinâmicos:** se a história inteira fosse
> pré-gerada, não saberia que você massacrou o boss de março ou quase morreu em maio. A
> *estrutura* é fixa (coerência); os *números, a fraqueza e a narração* são dinâmicos.

### 3.1 Onde a FRAQUEZA é definida (sem ambiguidade)
A **fraqueza mecânica** de um boss (qual módulo é o ponto fraco + o bônus de dano —
alimenta `bônus_fraqueza` de [05 §3.1](./05-temporadas-boss.md)) é definida pela
**Camada 2, no nível do boss daquele tier, quando a janela abre** — a partir do módulo
que você **negligenciou recentemente**. **Não** é fixada um ano antes pelo esqueleto.
- Ex.: em janeiro você abandonou treino → o boss de janeiro nasce "fraco a treino"; em
  fevereiro você largou os hábitos → o de fevereiro nasce "fraco a hábitos".
- O **esqueleto (Camada 1)** só dá a *identidade/tema* narrativo de cada boss; a fraqueza
  concreta vem do seu comportamento recente, por boss.

**Saída validada por JSON schema** em todas as camadas. **Fallback sem IA:** arco/boss só
pela engine + catálogo de temas genéricos — o sistema **nunca trava** por dependência de IA.

## 4. Recalibração narrativa

A recalibração anti-"front-load" ([05 §3.6](./05-temporadas-boss.md)) é decidida pela
**Camada 3** (médio) e **vestida de trama** pela **Camada 4** (leve):
- No checkpoint (≈ dia 15; checagens a cada 7–10 dias), se você está muito à frente do
  ritmo, o boss **enraivece** (ganha HP, com teto). Quem mede e ajusta os números é a
  Camada 3.
- A Camada 4 gera o **beat** que justifica ("o boss invocou poder sombrio…"), fazendo a
  dificuldade extra parecer **momento da história**, não truque.
- No ritmo → nada muda (sem enrave).

## 5. Tela da história (imersão)

Uma tela do arco mostra:
- a **lore** da temporada e os **capítulos** desbloqueados conforme você avança;
- seus **marcos de dano** tecidos no texto (a narração da Camada 4);
- o **estado do boss atual** (HP/fraqueza revelados conforme seu Foco — [05 §3.3](./05-temporadas-boss.md));
- a **árvore** dos bosses conectados (§2) e o que cada vitória desbloqueou.

## 6. Personalização / configuração da temporada

### 6.1 Agora (caminho simples) 🆕
- **Semente / tema:** na criação, você descreve a história que quer (ou amarra às suas
  metas reais do período). A Camada 1 constrói o arco **em volta da sua semente**. Custo
  ≈ adicionar seu texto ao contexto da IA; personalização alta.
- **Presets de estrutura:** *Trimestral* (mensais + final trimestral) · *Semestral* ·
  *Anual completo* (12→4→2→1).
- **Duração e data de início** livres (resolve "não dá pra fazer anual em junho" → arco
  de 6 meses começando agora; e "história de 3 meses" → preset trimestral).
- **Funciona de graça mecanicamente:** as fórmulas de HP/ritmo são agnósticas ao tamanho
  da janela ([05 §3.4/§3.6](./05-temporadas-boss.md)), então qualquer duração já roda.

### 6.2 Depois (avançado) 📋
- **Cadências arbitrárias** (boss a cada 15/20/30 dias misturados) — explode a UI e a
  geração; travado num conjunto pequeno (quinzenal/mensal) por ora.
- **Sub-histórias paralelas customizadas** (você desenhar N bosses paralelos com
  roteamento de dano próprio). Nota: uma versão disso **já existe** — os tiers rodam em
  paralelo e cada um toma dano da sua fonte; a versão totalmente customizável fica para
  depois.

## 7. Decisões fechadas

1. ✔ **Default da temporada:** arco **anual**, com presets menores (trimestral/semestral)
   disponíveis.
2. ✔ **Modelos por camada (configuráveis, 4 camadas / 3 níveis):** super forte =
   Camadas 1 e 2 (esqueleto + ajuste inicial do boss); médio = Camada 3 (recalibração
   quinzenal); leve = Camada 4 (narração/lore). Nomes não fixados (escolhidos no
   OpenRouter).
3. ✔ **Narração frequente:** roda mais vezes (ex.: a cada 2–3 dias) — custo baixo por ser
   uso pessoal + modelo leve.
4. ✔ **Fraqueza definida na Camada 2** (nível do boss/janela), do módulo negligenciado
   recente — não no esqueleto (ver §3.1).
