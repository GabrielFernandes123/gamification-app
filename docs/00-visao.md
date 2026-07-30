# 00 — Visão, Premissa e Princípios

> **Dono de:** a premissa do projeto, os princípios invioláveis, o diagnóstico
> fundador e o escopo (o que é e o que NÃO é o sistema).
> Este é a "constituição" — qualquer decisão futura é avaliada contra ele.
> Ver índice e regras anti-drift em [README](./README.md). Estado: ✅ implementado (varredura 2026-08-04) — a visão descrita aqui está construída.

---

## 1. Premissa

Um app **pessoal de gamificação da vida** — um RPG de produtividade onde as ações
da vida real (hábitos, treino, cuidado com o corpo, e futuramente dieta, finanças,
foco) movem um personagem com XP, nível, ouro, HP, atributos e equipamento, e
alimentam um objetivo macro recorrente (temporadas com boss).

O sucesso do app **não** é o usuário jogar muito. É o usuário **viver melhor** —
treinar, manter hábitos, cuidar do corpo e das finanças — e o jogo ser o que torna
isso recompensador e consistente.

## 2. Princípios invioláveis

Toda mecânica nova passa por estes filtros. Se ferir um deles, não entra (ou entra
modificada).

1. **Gamificar a vida, não virar um jogo pelo jogo.**
   Cada mecânica precisa reforçar um comportamento real. Equipamento, classe, boss
   e atributos existem para dar peso às ações da vida — nunca para criar um loop de
   jogo que compita com a vida real pela sua atenção. É por isso que classe
   *completa* (árvore de skills, habilidades ativas) está **fora de escopo**: ela
   puxa para "jogo pelo jogo".

2. **Tudo conversa com a mesma economia.**
   Não existem trilhos paralelos isolados. Todo módulo alimenta o mesmo personagem
   através do mesmo núcleo. (Foi a falha original — ver §4.) Dono das regras:
   [02-economia](./02-economia.md).

3. **Módulos são plugáveis.**
   Anexar um módulo novo = suas tabelas de domínio + chamar o núcleo + registrar no
   `module_registry`. Sem reescrever economia, histórico, conquistas ou navegação.
   Dono do contrato: [04-modulos](./04-modulos.md).

4. **Não ficar travado por tecnologia.**
   A lógica de jogo mora em API própria; o Supabase é plataforma (DB/Auth/Storage),
   e tudo é Postgres padrão (portável). Escolhemos o que faz o sistema funcionar
   melhor, não o que a stack impõe. Dono: [01-arquitetura](./01-arquitetura.md).

5. **Coerência antes de volume.**
   Preferimos poucos módulos que conversam perfeitamente a muitos módulos soltos.
   Documentar o contrato vem antes de codar a feature.

## 3. Os pilares (módulos)

Existentes hoje: **Hábitos**, **Treino**, **Corpo** (partes do corpo, medidas,
metas), **Skills**, **Loja/Recompensas**, **Conquistas**, **Side Quests**.

Futuros (FORA do escopo atual — ver [04 §4.6](./04-modulos.md)): **Dieta**, **Finanças**,
**Foco**. A arquitetura plugável já os suporta; entram depois sem retrabalho.

Camada por cima de todos: **Temporadas/Boss** (o objetivo macro). Não é um módulo —
é o que faz todos os módulos convergirem num objetivo comum. Dono:
[05-temporadas-boss](./05-temporadas-boss.md).

## 4. Diagnóstico fundador (o problema que NÃO podemos repetir)

O sistema tinha **duas economias paralelas que se ignoravam**:

- **Economia A (RPG):** personagem/XP/HP/ouro + skills — alimentada por hábitos,
  side quests e treino.
- **Economia B (fitness):** body parts com nível próprio que não fazia nada; medidas
  corporais sem gamificação alguma.

Sintomas: níveis de body part e de skill decorativos (sem efeito), medidas como um
diário desconectado, cada módulo reimplementando XP/ouro/conquistas no seu próprio
código (adicionar módulo doía), falta de objetivo macro, ouro superproduzido sem
ralo, streak isolado por hábito.

**A causa raiz foi construir sem um contrato consolidado.** Toda a arquitetura nova
(núcleo de economia + ledger único, atributos que dão função aos níveis, temporadas
que fazem tudo convergir) existe para curar isso. Esta documentação é o que impede
a recaída.

## 5. Escopo

**Dentro:** núcleo de economia + ledger; atributos fixos (Força/Agilidade/
Vitalidade/Foco) alimentados por skills + partes do corpo + equipamento;
equipamento; classe **leve** (identidade passiva que enviesa atributos); temporadas
com boss multi-tier (mensal→anual); geração de boss híbrida (engine determinística +
IA para tema/personalização); duas moedas (ouro do dia a dia + Essência de boss);
recompensas reais como gancho central. (Os módulos existentes ficam coerentes primeiro;
dieta/finanças/foco são futuros — ver [04 §4.6](./04-modulos.md).)

**Fora (por ora, decisão consciente):** classe completa com árvore de habilidades e
skills ativas; PvP/social; qualquer mecânica que vire jogo-pelo-jogo. Reavaliar só
se o usuário decidir conscientemente virar um RPG de verdade.

## 6. Glossário rápido

- **Núcleo / `_grant`:** ponto único que aplica XP/ouro/skill/atributo e grava no
  ledger. Detalhe em [01](./01-arquitetura.md) e [02](./02-economia.md).
- **Ledger:** registro append-only de toda variação de XP/ouro, por `source_type`.
- **Atributo:** Força/Agilidade/Vitalidade/Foco — efeitos na batalha do boss.
- **Build:** seu conjunto de atributos = skills + partes do corpo + equipamento.
- **Temporada:** janela de tempo com um boss; tiers mensal/trimestral/semestral/anual.
- **Ouro:** moeda do dia a dia. **Essência:** moeda rara, só de boss.
- **`module_registry`:** tabela que lista os módulos; shell/histórico/objetivos a leem.
