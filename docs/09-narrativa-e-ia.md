# 09 — Narrativa e IA (Arco da Temporada, Geração, Recalibração)

> **Dono de:** o arco narrativo da temporada, a hierarquia conectada dos bosses, as 3
> camadas de geração por IA, a recalibração narrativa, a tela da história e a
> personalização/configuração da temporada.
> Combate e números → [05-temporadas-boss](./05-temporadas-boss.md). Atributos (Foco/
> fraqueza) → [03](./03-atributos-build.md). OpenRouter/jobs → [01](./01-arquitetura.md).
> Dados → [06](./06-dados.md). Estado: ✅ implementado (varredura 2026-08-04) — arco, saga, recalibração e retrospectiva em `narrative.controller.ts`. Legenda: 🆕 ajustável · 📋 futuro.

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

## 3.2 As TRÊS CAMADAS de "ligado à história" ✅ 🆕

> Migrado de `varredura de pontas soltas (2026-07-31)` §0 em **2026-08-06**, ao descartar os docs da
> raiz (não eram versionados).

"Ligado à história" quer dizer coisas diferentes em três níveis, e confundi-los é
o que faz um módulo **parecer** conectado quando não está.

| Camada | O que é | Como se liga |
|---|---|---|
| **1. Economia** | O evento entra no ledger | `_grant` — **automático** |
| **2. Combate** | O evento fere o boss, e o narrador vê a origem do golpe | `module_registry.kind = 'atividade'` — **automático** |
| **3. Narrativa** | O evento vira capítulo, criatura, nome temático ou arte | **código por módulo** — era aqui que faltava |

### A camada 2 é automática, e isso não é óbvio

O filtro vive em `boss-engine.service.ts`:

```sql
where ativo = true and kind = 'atividade' and key <> 'tracking'
```

**Nenhum módulo precisou de código para ferir o boss.** E o golpe carrega
`boss_damage_events.source_type`, que entra nos golpes recentes do snapshot —
então o narrador sabe que foi o Diário ou o Treino que acertou.

| Ferem o boss (11) | Não ferem |
|---|---|
| habit · workout · sidequest · body_goal · body_measurement · sleep · cardio · reading · journal · nutrition · work | `tracking` — excluído **de propósito**: é custo, não conquista |
| | `plan` · `bucket` · `relationship` · `event` — são `kind = 'meta'` |

> ⚠️ **Ligado ≠ testado.** O ledger só tem eventos de `tracking`, `habit`,
> `store`, `sidequest`, `workout` e `death`. Os módulos novos de atividade nunca
> foram usados, então esse caminho **nunca rodou**. O primeiro registro de diário
> deve aparecer em `boss_damage_events` — se não aparecer, é **bug**, não falta
> de feature. Está no roteiro de testes ([16](./16-acoes-e-testes.md)).

### A camada 3 era o buraco — e foi fechada em 2026-08-06

Ver §3.3 logo abaixo: o narrador passou a enxergar os módulos de vida real.

## 3.3 O que o narrador ENXERGA ✅ 🆕 (2026-08-06)

Até aqui o narrador lia **sete tabelas, todas de combate**: `bosses`,
`codex_entries`, `narrative_beats`, `journal_entries`, `profiles`, `seasons` e
`season_story_settings`.

Não lia hábitos, sono, nutrição, leitura, treino, trabalho nem relacionamentos.
**Quinze módulos de vida real que nunca viravam uma frase.** Você lia 200 páginas
ou dormia mal a semana toda e a história continuava falando só da briga com o
boss — a alma do projeto enxergando um quinze avos dele.

### A inversão: o narrador PUXA, os módulos não empurram

A saída óbvia seria cada módulo escrever o próprio capítulo. Foi descartada:

- viraria um **log** — quinze módulos gritando "aconteceu algo aqui!";
- exigiria ensinar **quinze lugares** a escrever narrativa, cada um com o seu
  critério de "isto merece um capítulo".

Em vez disso, um lugar só sabe ler a semana: `src/common/module-digest.ts`
([06 §9.16](./06-dados.md)). Ele agrega os oito módulos de vida — sono, nutrição,
leitura, trabalho, relacionamentos, sonhos, diário e treino — e devolve fatos
curtos que entram no prompt.

### Três regras que fazem a diferença entre matéria-prima e enfeite

1. **O fato tem de ser CAUSA.** O prompt exige tecer ao menos um fato da vida
   real como motivo do que acontece na história. Sem essa instrução o modelo
   escreve *"enquanto isso, ele dormia bem"* — decoração. O que se quer é o
   oposto: o esforço real é o que move o arco.
2. **Silêncio é um fato.** Sem registro nenhum no período, o prompt manda
   **não inventar** atividade. Uma semana parada é matéria narrativa legítima;
   uma semana inventada corrói a única coisa que a história tem de valioso, que
   é ser verdade sobre você.
3. **Módulo desligado não vira história.** Quem desligou Leitura
   ([06 §9.15](./06-dados.md)) não quer o narrador mencionando livros.

### O que continua fora, de propósito

O **conteúdo** do diário. Só a contagem de entradas entra no digest; expor o
texto ao modelo segue sendo opt-in por `retrospective_uses_journal` (§6), por
privacidade. Um diário é o lugar onde se escreve o que não se conta.

> **Falhar aqui não pode impedir o capítulo.** O digest é `catch`-ado: história
> sem ele é pior, mas história nenhuma é muito pior.

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
