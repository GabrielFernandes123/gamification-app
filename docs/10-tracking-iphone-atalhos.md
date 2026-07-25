# Tracking no iPhone via Atalhos do iOS

O iPhone não expõe tempo de uso para apps de terceiros (a Screen Time API é
trancada por design). O caminho: **automações do app Atalhos** disparam quando
um app abre/fecha e mandam eventos para a API, que casa os pares no servidor e
transforma em intervalos do pipeline normal de tracking (rollup + cobrança).

- API de produção: `https://game-api.executivosdigital.com.br/v1`
- Endpoint de pareamento: `POST /tracking/pair` (público, código de 1 uso)
- Endpoint de eventos: `POST /tracking/event` (Bearer com token `dvc_...`)

---

## Passo 1 — Atalho "Evolve Setup" (rodar UMA vez)

Cria o pareamento e devolve o token do dispositivo.

Ações no app Atalhos (novo atalho, nome `Evolve Setup`):

1. **Solicitar entrada** → Texto → pergunta: "Código de pareamento" (gere o
   código no app/web em **Tempo → Dispositivos → Gerar código**; vale 10 min).
2. **Obter conteúdo da URL**:
   - URL: `https://game-api.executivosdigital.com.br/v1/tracking/pair`
   - Método: `POST`
   - Corpo do Pedido: `JSON`
     - `code` = *Entrada Fornecida* (resultado do passo 1)
     - `name` = `iPhone`
     - `platform` = `iphone`
3. **Obter valor do dicionário** → chave `device_token` (da saída do passo 2).
4. **Copiar para a Área de Transferência** (e/ou **Mostrar resultado**).

Rode o atalho, digite o código, e o token `dvc_...` fica no clipboard.

## Passo 2 — Atalho "Evolve Track" (o trabalhador)

Único atalho que conhece a URL e o token; as automações só o invocam.

Ações (novo atalho, nome `Evolve Track`):

1. **Receber entrada** de tipo **Dicionário** (em "Detalhes" do atalho, ligar
   "Usar como Ação Rápida" não é necessário; ele só será chamado por automações
   com entrada).
2. **Obter valor do dicionário** → chave `matcher` da *Entrada do Atalho* →
   renomeie a variável para `matcher`.
3. **Obter valor do dicionário** → chave `event` da *Entrada do Atalho* →
   variável `event`.
4. **Obter conteúdo da URL**:
   - URL: `https://game-api.executivosdigital.com.br/v1/tracking/event`
   - Método: `POST`
   - Cabeçalhos: `Authorization` = `Bearer dvc_SEU_TOKEN_AQUI` (cole o token do
     Passo 1 — uma única vez, aqui)
   - Corpo do Pedido: `JSON`
     - `matcher` = variável `matcher`
     - `event` = variável `event`

> Sem notificação de resultado — a automação roda silenciosa. Se a rede
> falhar, o evento se perde (aceitável: o open órfão é descartado em 6h e o
> servidor nunca inventa tempo).

## Passo 3 — Automações por app (2 por app)

App Atalhos → aba **Automação** → **+** → **App**:

**Automação A (abrir):**
- App: YouTube · marcar **É aberto**
- **Executar Imediatamente** (sem confirmação)
- Ação: **Executar atalho** → `Evolve Track` → Entrada: **Dicionário**
  - `matcher` = `youtube`
  - `event` = `open`

**Automação B (fechar):**
- App: YouTube · marcar **É fechado**
- **Executar Imediatamente**
- Ação: **Executar atalho** → `Evolve Track` → Entrada: **Dicionário**
  - `matcher` = `youtube`
  - `event` = `close`

Repita o par para cada app monitorado (Instagram → `instagram`, TikTok →
`tiktok`...). O `matcher` é livre — só precisa BATER com a fonte do Passo 4.

## Passo 4 — Criar a fonte (define franquia, custo e limite-boss)

No app ou web: **Tempo → Fontes → Nova fonte**
- Tipo: **App**
- Matcher: o MESMO texto usado na automação (ex.: `youtube`)
- Franquia grátis: ex. 30 min/dia
- Custo: ex. 60 ouro/h
- Limite antes do boss: ex. 120 min/dia (0 = desligado)

A fonte define **três zonas** de uso diário:

```
0 ───── franquia ───── limite-boss ─────▶
  grátis    só ouro       ouro + alimenta o boss
```

Acima do limite-boss, cada segundo além dele soma no "feed" do dia: +1% de
dano no contra-ataque a cada 5 min (teto +50%), e 1h+ de zona 3 torna o dia
ruim por si só (contra-ataque mesmo com a meta de XP batida). Existe também
`hp_per_hour` no schema (dano direto de HP por hora excedida) — desligado por
padrão, gancho futuro.

Sem fonte, o tempo ainda aparece no painel Hoje como "só estatística" — não
cobra nada.

## Comportamento e limitações (esperado, não bug)

- **"Fechado" = saiu do primeiro plano**: trocar de app ou bloquear a tela
  encerra o intervalo. Música com tela bloqueada não conta.
- **Close perdido** (iPhone desligou, automação falhou): o próximo `open` do
  mesmo app fecha o trecho pendente em até 4h; opens órfãos são descartados
  após 6h pelo cron. O sistema prefere **subcontar** a inventar tempo.
- **Cobertura por adesão**: só conta o que tiver automação. Não é visão total
  do celular.
- **Sem bloqueio**: Atalhos não conseguem impedir o uso — o débito de ouro no
  ledger é o dissuasor.
- O matcher do iPhone (`youtube`) e o domínio do PC (`youtube.com`) são fontes
  SEPARADAS, cada uma com sua franquia. Se quiser franquia única entre
  plataformas, use o mesmo matcher/kind numa fonte só — hoje kind `app` do
  iPhone não se soma ao kind `domain` da extensão (decisão: franquias
  independentes por contexto).

## Depuração rápida

- `POST /tracking/event` com token revogado → 401 (rode o Evolve Setup de novo
  com um código novo).
- Resposta `{"ignored":true,"reason":"no_open_pending"}` num close → a
  automação de abrir não rodou (confira "Executar Imediatamente").
- Painel **Tempo → Hoje** atualiza em ~1 min (refetch automático).
