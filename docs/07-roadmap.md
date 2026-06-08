# 07 — Roadmap (Fases de Construção)

> **Dono de:** a ordem de construção. O "o quê" de cada coisa mora nos docs de domínio;
> aqui é só o "quando" e o "por que nessa ordem". Estado: 📋 projetado.
> Legenda: 🧱 infra pesada · ✨ valor visível ao usuário.

---

## Princípio da ordem
Cada fase **deixa o app funcionando** e **destrava a seguinte**. A Fase 0 é o
investimento que paga todo o resto; as fases 1–3 colhem ganhos e validam o núcleo; a
4–6 constroem a nova camada de jogo (build → boss → narrativa); a 7 afina. Nenhuma fase
quebra o que já existe — portamos lógica, não dados ([01 §10](./01-arquitetura.md),
[06 §12](./06-dados.md)).

---

## Fase 0 — Fundação: API + ledger + núcleo 🧱
**Objetivo:** mover a lógica para a API e instalar a espinha, sem mudar o comportamento.
- Subir a **API Nest** conectada ao mesmo Postgres; validar o JWT do Supabase ([01 §7](./01-arquitetura.md)).
- Criar `economy_events` + `module_registry` + o núcleo **`_grant`** ([01 §3/§4](./01-arquitetura.md), [02 §9](./02-economia.md)).
- Portar `complete_habit` / `complete_workout_session` / `complete_side_quest` /
  `complete_body_goal` de RPC → **endpoints** que usam `_grant` (saída idêntica).
- Apontar o **app para a API** (trocar `supabase.rpc` por REST); migrar leituras;
  aposentar RPCs antigas; mover os fechamentos (diário/semanal/mensal) para **Nest `@Cron`**
  ([01 §8](./01-arquitetura.md), atenção a timezone SP).
- **Resultado:** comportamento igual; lógica na camada certa; ledger gravando tudo.
**Por que primeiro:** é o enabler de todo o resto.

## Fase 1 — Reconectar economia + insumos de build ✨
**Objetivo:** dar função aos níveis e criar a narrativa de consistência.
- **Maestria:** nível da skill primária → bônus de XP no `_grant` ([02 §5.2](./02-economia.md)) — *valor imediato em toda atividade*.
- **Streak de personagem** no HUD, lido do ledger ([02 §6](./02-economia.md)).
- **Ancorar XP de treino** na escala de dificuldade ([02 §4](./02-economia.md), [04 §4.3](./04-modulos.md)).
- Adicionar os **insumos de atributo**: `skills.attribute_key`, `body_parts.attribute_key`
  ([03 §3](./03-atributos-build.md)) + colunas `characters.essencia`/`class` e a tabela
  `character_attribute_points` (estrutura; efeito de combate vem na Fase 4–5).
- **Resultado:** níveis de skill/parte passam a importar; HUD com streak global.

## Fase 2 — Higiene de dados ✨
**Objetivo:** limpar dívidas e ativar regras dormentes (barato; fazer enquanto mexe no schema).
- Campos mortos: `daily_*_goal` (dar função ou remover), `body_parts.color`,
  `fitness_exercises.category/notes`, `body_goals.icon_name/media_url`.
- Implementar `body_goals.deadline`; consequência de **side quest vencida**.
- **Medida registrada** → evento trivial no ledger + avalia metas na hora ([04 §4.4](./04-modulos.md)).
- **Restock automático** de recompensas (cron na API).

## Fase 3 — Shell de navegação pluggável ✨
**Objetivo:** preparar o terreno (e curar a confusão de navegação atual).
- Navegação + filtros de histórico **leem o `module_registry`** ([04 §2](./04-modulos.md), [08](./08-navegacao-ux.md)).
- Unificar as abas do **Corpo** (tudo painel + modais p/ CRUD).
- Remover portas duplicadas (Skills/Side Quests só via dashboard); regra modal vs. tela;
  corrigir "Histórico".
- **Resultado:** shell coerente e pronto para receber as telas novas (build, boss, história).

## Fase 4 — Build: Atributos, Equipamento e Classe ✨
**Objetivo:** sua vida vira uma ficha de personagem (+ ralo de ouro).
- **Cálculo do atributo total** na API (skills + partes + equip + pontos + classe — [03 §2](./03-atributos-build.md)).
- **Equipamento:** `equipment_catalog` + `character_equipment`; slots; `required_level`;
  equipar/desequipar; auto-desequipar na morte ([03 §4](./03-atributos-build.md), [02 §8.1](./02-economia.md)). Loja de equipamento = **ralo de ouro**.
- **Classe leve:** escolha + bônus +15% ([03 §5](./03-atributos-build.md)).
- **Tela de personagem/build:** ver seus atributos vindos da vida real (valor próprio,
  mesmo antes do combate).
- **Resultado:** ralo de ouro real + build completo e visível. (Efeito de combate dos
  atributos chega na Fase 5; Essência só entra com o boss.)

## Fase 5 — Temporadas / Boss (combate) ✨
**Objetivo:** o objetivo macro que faz tudo convergir.
- Tabelas de boss ([06 §9](./06-dados.md)); **combate** (dano por Força/crítico/fraqueza,
  contra-ataque pela meta diária com Vitalidade/esquiva, HP, fases/enrave, recalibração —
  engine determinística + clamp, [05 §3](./05-temporadas-boss.md)).
- **Objetivos cross-module** (lê o `module_registry`, [05 §5](./05-temporadas-boss.md)).
- **Recompensas:** pontos de atributo permanentes (populam `character_attribute_points`),
  **Essência**, drop de equipamento, cosmético, recompensa real, cargas ([05 §7](./05-temporadas-boss.md)).
- **Começar só com o tier mensal** (validar o loop); ligar os longos na Fase 7.
- **Resultado:** late-game com propósito; Essência entra na economia; morte ganha
  alternativa (a temporada é recuperável).

## Fase 6 — Narrativa / IA (imersão) ✨
**Objetivo:** transformar a barra de HP em jornada.
- Integração **OpenRouter** — 4 camadas / 3 modelos ([09 §3](./09-narrativa-e-ia.md)).
- Esqueleto do arco, ajuste do boss (define a fraqueza), recalibração narrativa, narração.
- **Tela da história** + **personalização** da temporada (semente + presets + duração/data — [09 §5/§6](./09-narrativa-e-ia.md)).
- **Fallback sem IA** (catálogo) — nunca trava.

## Fase 7 — Polimento e expansão de economia ✨
- Conquistas raras com recompensa; **calibrar o ouro** com os novos ralos.
- **Suavizar a morte hardcore** (modo configurável) — agora que a tensão vive na temporada.
- **Ligar os tiers longos** (trimestral/semestral/anual) e a hierarquia conectada ([09 §2](./09-narrativa-e-ia.md)).
- (Futuro 📋, fora deste roadmap: módulos Dieta/Finanças/Foco e a customização avançada
  de temporada — a arquitetura já suporta.)

---

## Resumo visual
```
0 Fundação (API+ledger+_grant) 🧱
1 Reconectar (maestria, streak, insumos de build) ✨
2 Higiene ✨
3 Shell pluggável ✨
4 Build (atributos+equip+classe, ralo de ouro) ✨
5 Boss (combate+recompensas, só mensal) ✨
6 Narrativa/IA (história+personalização) ✨
7 Polimento (ouro, morte configurável, tiers longos) ✨
```
