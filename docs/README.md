# Documentação do Sistema — Gamificação da Vida

> **Fonte única de verdade** do projeto. Antes de implementar qualquer coisa nova,
> consulte e atualize o documento dono daquele conceito. Criado em 2026-06-06 após
> a sessão de consolidação (decisão: pausar e documentar antes de seguir o
> desenvolvimento, para não reconectar/desconectar lógica novamente).

## Por que esta pasta existe

O sistema cresceu (hábitos, treino, corpo, loja, conquistas, side quests) e vamos
adicionar muito: API própria, núcleo de economia, atributos, equipamentos, classes,
temporadas/boss com IA. O maior risco é **a lógica desconectar entre si** — foi
exatamente o problema diagnosticado no início (duas economias paralelas que se
ignoravam). Estes documentos são o mecanismo que impede isso.

## Regras anti-drift (LEIA ANTES DE EDITAR)

1. **Dono único.** Cada conceito vive em UM documento. Fórmulas de economia só em
   `02-economia.md`; atributos só em `03-atributos-build.md`; etc. Nenhum número
   duplicado entre arquivos.
2. **Contratos, não cópias.** Cada módulo (`04`) declara o que *entrega* ao núcleo
   (como chama `_grant`), não reimplementa XP/ouro/dano.
3. **Referência cruzada.** Aponte para o dono (`ver 02-economia §dano`), nunca
   copie o conteúdo.
4. **Estado explícito.** Marque cada seção: ✅ implementado · 🚧 em construção ·
   📋 só projetado. Assim sempre se sabe o que é real vs. plano.

## Mapa dos documentos

| # | Documento | Dono de | Estado |
|---|---|---|---|
| 00 | `00-visao.md` | Premissa, princípios invioláveis, diagnóstico | 📋 |
| 01 | `01-arquitetura.md` | API Nest + Supabase-plataforma; o que mora onde; ledger; fluxo de request; contrato de módulo | 📋 |
| 02 | `02-economia.md` | XP, ouro, nível, HP, dano, morte, streaks, bônus — TODAS as fórmulas | 📋 |
| 03 | `03-atributos-build.md` | Atributos fixos, mapeamento skill/corpo→atributo, equipamentos, classes leves, cálculo de atributo total | 📋 |
| 04 | `04-modulos.md` | Contrato de módulo + hábitos/treino/corpo/dieta/finanças/foco e como cada um chama o núcleo | 📋 |
| 05 | `05-temporadas-boss.md` | Tiers (mensal/trimestral/anual), HP do boss, dano jogador↔boss via atributos, objetivos cross-module, recompensas | 📋 |
| 09 | `09-narrativa-e-ia.md` | Arco narrativo, hierarquia conectada dos bosses, 3 camadas de IA, recalibração narrativa, tela da história, personalização da temporada | 📋 |
| 06 | `06-dados.md` | Modelo de dados consolidado (tabelas + FKs) | 📋 |
| 07 | `07-roadmap.md` | Fases ordenadas de correção/construção | 📋 |
| 08 | `08-navegacao-ux.md` | Design system (tokens, componentes), arquétipos de tela, regra modal vs tela, navegação pluggável, estados, telas novas | 📋 |

## Princípios invioláveis (resumo — detalhe em 00)

- **Gamificar a vida, não virar um jogo pelo jogo.** Toda mecânica nova precisa
  reforçar comportamento real. Classe/equipamento/boss servem à vida, não ao jogo.
- **Módulos plugáveis.** Anexar um módulo novo = tabelas de domínio + chamar o
  núcleo + registrar no `module_registry`. Sem tocar no shell.
- **Não ficar travado por tecnologia.** Supabase é plataforma (DB/Auth/Storage);
  a lógica de jogo mora na API própria. Tudo é Postgres padrão (portável).
