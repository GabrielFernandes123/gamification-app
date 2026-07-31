# 16 — Ações e Testes (o que só VOCÊ pode fazer)

> **Dono de:** tudo que depende de uma pessoa — rodar um script longo, tocar num
> aparelho, decidir um rumo de produto. Nada aqui é código pendente à espera de
> quem programa.
>
> Criado em **2026-08-06**, ao descartar os cinco documentos de análise da raiz do
> workspace. Eles viviam **fora de qualquer repositório git** — na troca de
> ambiente sumiriam. Este mora no repo e sobe junto.
>
> Legenda: 🔴 bloqueia outras coisas · 🟡 vale fazer logo · ⚪ quando der ·
> ❓ decisão, não tarefa.

---

## 1. Testes que nenhum `tsc` pega

O `tsc`, o `nest build` e os 63 testes cobrem o que é verificável em máquina.
Estes três **só o uso real prova** — e cada um já falhou uma vez em silêncio.

### 1.1 🔴 O botão "Feito" da notificação (no aparelho)

**Por que importa:** o `categoryId` estava divergente entre API (`habit-single`) e
app (`habitSingle`). O iOS casa a categoria por **string exata** e, sem casar, o
botão simplesmente **não aparece** — sem erro nenhum, nem no servidor nem no
aparelho. Foi alinhado em 2026-08-06, mas só o iPhone prova.

**Como testar:**
1. Deixe **exatamente um** hábito pendente (com dois ou mais o servidor não manda
   categoria — "Feito" marcaria qual?).
2. Espere a notificação.
3. Puxe-a para baixo → o botão **"Feito"** tem de aparecer.
4. Toque nele **sem abrir o app** → o hábito é marcado.
5. Confirme que o app **não foi trazido para a frente** (é o ponto do recurso).

**Se falhar:** compare `notifications.service.ts` (`categoryId`) com
`features/notifications/categories.ts` (`HABIT_CATEGORY`). Têm de ser idênticos.

### 1.2 🔴 O primeiro golpe de cada módulo novo no boss

**Por que importa:** onze módulos ferem o boss **automaticamente**, sem código
próprio ([09 §3.2](./09-narrativa-e-ia.md)). Mas o ledger só tem eventos de
`tracking`, `habit`, `store`, `sidequest`, `workout` e `death` — os módulos novos
**nunca rodaram esse caminho**.

**Como testar:** registre uma vez em cada módulo novo (diário, sono, nutrição,
leitura, cardio, trabalho) e confira:

```sql
select source_type, count(*) from public.boss_damage_events group by source_type;
```

**Se um módulo não aparecer, é BUG, não falta de feature.**

### 1.3 🟡 O narrador mencionando a vida real

**Por que importa:** o narrador passou a receber um digest cross-módulo
([09 §3.3](./09-narrativa-e-ia.md)). Se o prompt não estiver sendo obedecido, o
capítulo continua falando só do boss — e isso não quebra nada, só desperdiça.

**Como testar:** registre alguma coisa (leitura, sono, treino), gere um capítulo e
leia. O fato tem de aparecer como **causa** do que acontece, não como enfeite do
tipo *"enquanto isso, ele dormia bem"*.

---

## 2. Operações longas

### 2.1 🔴 Importar o catálogo de alimentos

Destrava a tela de código de barras (§4.1) e a busca por produto de marca.

```bash
cd gamificacao-api
node scripts/import-openfoodfacts.mjs --dry-run   # confere o filtro primeiro
node scripts/import-openfoodfacts.mjs             # Brasil, macros completos
```

**Saiba antes de começar:**

- **É longo.** O dump é ordenado por código de barras, e o EAN brasileiro começa
  com **789** — o Brasil está no fim do arquivo. Medido: as primeiras 600 mil
  linhas não têm **um** produto brasileiro. O script lê o dump inteiro,
  necessariamente. Dezenas de minutos a horas, conforme a conexão.
- **Passa a maior parte do tempo com "aceitas 0".** É esperado. O progresso
  mostra minutos decorridos justamente por isso.
- **Pode repetir sem estrago** se cair no meio (`on conflict do update`).
- **Tamanho:** ~50 mil produtos ≈ **30 MB**. O banco tinha 26 MB antes.

**Logo depois, no mesmo dia:** criar o índice de busca (§2.2). Com 40 mil linhas
a busca atual degrada — ver [14 §16.5](./14-backlog-modulos-e-mecanicas.md).

### 2.2 🔴 `pg_trgm` + índice GIN — logo após a importação

A busca é `search_name like '%termo%'`, e um btree **não é usado** nesse padrão.
Com 582 linhas ninguém nota; com 40 mil, sim. A extensão já está disponível neste
Postgres (verificado em `pg_available_extensions`) — não precisa pedir nada à
infra.

**Não faça antes da importação:** otimizar busca de 582 linhas é otimização
prematura. O gatilho é o volume.

---

## 2.3 ⚪ A conta DEMO

Existe uma segunda conta com histórico de **todos** os módulos — inclusive os que
você ainda não usou. Serve para ver painel cheio e testar sem sujar a sua.

```bash
cd gamificacao-api
npx ts-node -r tsconfig-paths/register scripts/seed-demo.ts   --apply --reset --email mouragabriel205@gmail.com
```

**Como usar:** faça login no app/web com o e-mail da demo. As contas são
independentes — o schema todo é `user_id` + RLS, então não há vazamento entre
elas.

### As quatro travas, e por que existem

| Trava | O que impede |
|---|---|
| 1. Alvo **explícito por e-mail** | o script antigo (`seed-rich-demo.mjs`) pegava "o profile mais recente" e sobrescrevia XP e ouro — rodá-lo hoje destruiria a conta real |
| 2. **Recusa** conta com dado | não escreve por cima de nada que você tenha registrado |
| 3. Alvo tem de **parecer demo** | **conta VAZIA ≠ conta DESCARTÁVEL.** Foi o furo real: em 2026-08-06 um teste apontou para o gmail do dono, que estava vazio, e a trava 2 deixou passar |
| 4. Tudo pelo **`_grant`** | é o único jeito de `sum(economy_events) == characters.gold` continuar verdade. Cravar ouro na mão foi o que o script antigo fazia |

### O que esperar

- **É lento** — cada registro passa pelo `_grant`, que faz ~10 queries. Contra o
  Postgres remoto dá alguns minutos. É o preço de o ledger fechar; um `insert`
  direto seria instantâneo e mentiroso.
- **É determinístico** — semente fixa, então a mesma demo sai igual toda vez.
  "Reproduzir o que eu vi ontem" funciona.
- **`--reset` limpa antes** — demo suja não serve para testar de novo.
- **Os crons rodam para ela também.** Isso é bom (você vê o sistema respirar),
  mas significa que a demo evolui sozinha.
- Inclui **dias de trabalho paralelo** de propósito — é o caso que os tetos
  existem para tratar ([04 §4.16.1](./04-modulos.md)).

## 3. Decisões de produto (não são tarefas)

### 3.1 ❓ Plano / cardápio na nutrição — entra quando?

Hoje a nutrição é **retrospectiva**: você registra o que comeu. Um cardápio a
torna **prospectiva**: você define o que vai comer e o app cobra.

É outro produto, e a maior fatia de trabalho que sobrou no backlog. Da estrutura,
`nutrition_meal_slots` já existe — falta o "o quê" dentro de cada slot. A métrica
de intenção × execução seria emprestada do módulo Plano, não a tabela.

### 3.2 ❓ Abas de estatística: por módulo ou por domínio da vida?

Ver [08 §8.1.2](./08-navegacao-ux.md). O argumento que adiava a decisão caiu com o
liga-desliga. Reavaliar quando 3–4 módulos novos tiverem histórico — a decisão
fica muito mais fácil olhando painéis com dado real.

---

## 4. O que está pronto e espera outra coisa

Nada aqui é trabalho. É rastreamento, para não parecer esquecido.

| Item | Espera |
|---|---|
| **Tela de código de barras** (API pronta) | a importação (§2.1) — a TACO é toda genérica e não tem código de barras nenhum |
| **Painéis de sono e nutrição** (construídos) | você **usar** os módulos. Vão parecer vazios até lá, e é esperado — desligue o que ainda não começou ([04 §2.1](./04-modulos.md)) |
| **⑪ Ascensão** | um ciclo anual completo ([15 §1](./15-mecanicas-futuras.md)) |

---

## 5. A única dívida de CÓDIGO que sobrou

### 5.1 🔴 A Início consumir o `GET /today`

A rota existe, funciona e é consumida pelo **widget**. O `dashboard.tsx` continua
montando o dia com queries por módulo.

**É a promessa não cumprida do corte do app:** as "9 queries → 3" dependem só
desta migração. Nada a bloqueia — é a próxima coisa a fazer por quem programa.

---

## 6. Como manter este documento honesto

Foi o erro que matou os cinco documentos da raiz: eles eram **análise e placar de
execução ao mesmo tempo**, e o placar envelheceu. Dois deles chegaram a afirmar,
por seis dias, o contrário do que o repositório mostrava.

A regra aqui:

1. **Item feito sai da lista** — não vira "✅ feito" acumulando no fim.
2. **O que virou regra migra** para o doc dono (02, 04, 06, 08, 09) e some daqui.
3. **Este doc só descreve o futuro.** Passado é o git.
