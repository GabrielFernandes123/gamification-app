# 12 · iOS — travas conhecidas e frentes de pesquisa

> **Propósito deste documento**: briefing autocontido para investigar soluções de
> tracking e bloqueio no iPhone. Reúne tudo que já foi tentado, decidido e
> descartado — para não repetir caminho — e lista as perguntas em aberto.
>
> ⚠️ **Aviso de validade**: o levantamento abaixo reflete o comportamento
> conhecido até meados de 2026. Versões novas do iOS podem ter mudado APIs ou
> aberto caminhos novos. **Confirmar tudo contra a documentação oficial atual
> antes de concluir qualquer coisa** — especialmente os itens marcados 🔍.

---

## 1. O que o sistema precisa do iPhone

O app é um RPG de hábitos com um módulo de **tempo de tela** ([11-tracking](./11-tracking-tempo-de-tela.md)).
Cada fonte monitorada (site ou app) tem quatro zonas de uso diário:

```
0 ──── franquia ──── limite-boss ──── bloqueio ────▶
 grátis    só ouro    ouro + boss    interceptado (liberar custa ouro)
```

Do iPhone precisamos, em ordem de importância:

| # | Necessidade | Estado hoje |
|---|---|---|
| 1 | **Medir** tempo de uso por app | ⚠️ parcial (Atalhos) |
| 2 | **Avisar** quando começa a cobrar / lembrete periódico | ✅ push do servidor |
| 3 | **Bloquear** com tela de "pagar para liberar" | ❌ inexistente |
| 4 | Bloquear por **palavra-chave** em conteúdo | ❌ inexistente |
| 5 | Distinguir **modos** de uso (ativo/paralelo/áudio) | ❌ só "ativo" |

---

## 2. O que já está implementado e funcionando

**Caminho escolhido: automações do app Atalhos** (receita completa em
[10-tracking-iphone-atalhos](./10-tracking-iphone-atalhos.md)).

- Duas automações por app (`É aberto` / `É fechado`) chamam um atalho que faz
  `POST /v1/tracking/event` com `{matcher, event: 'open'|'close'}`.
- O **servidor** casa os pares (`usage_open_events`) e transforma em intervalo,
  porque o Atalho não tem estado confiável entre execuções.
- Autenticação por token opaco `dvc_` obtido via código de pareamento.
- Push (Expo) já entrega no celular os alertas do que acontece no PC.

---

## 3. Travas encontradas

### 3.1 Screen Time API (FamilyControls / DeviceActivity / ManagedSettings)

O caminho "oficial" da Apple para uso de apps. Travas levantadas:

1. **Os dados não saem da sandbox.** O uso só é renderizado dentro de uma
   *extension* (`DeviceActivityReport`); o app hospedeiro não consegue ler os
   valores para enviar a um servidor. É privacidade por design, não bug. 🔍
2. **Seleção de apps devolve tokens opacos.** `FamilyActivitySelection` entrega
   tokens que não expõem bundle id / nome de forma utilizável — apps reais
   contornam pedindo ao usuário para nomear a seleção. Isso dificulta o
   casamento com nossos `matchers` (strings como `youtube`). 🔍
3. **Medição por degraus.** A alternativa usada por Opal/Jomo é agendar dezenas
   de eventos de limiar ("avise quando atingir N minutos") e somar callbacks:
   precisão de ~1 min e callbacks notoriamente atrasados/agrupados/engolidos
   pelo sistema. 🔍
4. **Entitlement.** Family Controls exige entitlement; em *development* dá para
   habilitar no Xcode, mas distribuição exige aprovação da Apple.
5. **Custo de desenvolvimento.** Extension sem UI, ~6s de execução por callback,
   logging pobre → depuração às cegas. Exige build nativo (dev client/EAS), não
   roda em Expo Go.
6. **Conta paga obrigatória.** Sem conta de desenvolvedor paga, o build expira a
   cada 7 dias — inviável para uso contínuo.

### 3.2 Atalhos (caminho atual)

1. **Não bloqueia.** Atalhos não conseguem impedir a abertura de um app. Só
   notificar. Esta é a trava que impede a zona 4 no iPhone.
2. **Cobertura por adesão.** Só conta o que tiver automação criada à mão (2 por
   app). Não há como provisionar programaticamente.
3. **"Fechado" = saiu do primeiro plano.** Trocar de app ou bloquear a tela
   encerra o intervalo → vídeo/música com tela bloqueada não é contado.
4. **Sem estado e sem fila.** O atalho não guarda nada entre execuções; se a
   rede falhar no momento do POST, o evento **se perde** (não há retry). Daí a
   decisão de subcontar: opens órfãos são descartados após 6h.
5. **Sem distinção de modo.** Só produz o equivalente a `active`.

### 3.3 Bloqueio de conteúdo / palavras

1. Não há como inspecionar conteúdo de **outros apps**.
2. Safari suporta *content blockers* por lista de regras estática (JSON) — só no
   Safari; Chrome/Firefox no iOS **não** suportam extensões. 🔍
3. O mecanismo real de bloqueio no iOS é o *shield* do ManagedSettings, preso ao
   mesmo entitlement do item 3.1.

### 3.4 Geral

- Não existe equivalente ao `chrome.tabs` (navegador) ou à janela em foreground
  do Windows: um app de terceiros **não enxerga** qual app está em uso.
- Execução em background é limitada; não há polling contínuo confiável.

---

## 4. Decisões já tomadas (não re-propor sem motivo forte)

| Decisão | Razão |
|---|---|
| ❌ Integrar com o StayFree | Não tem API; só exportação manual de backup |
| ❌ Screen Time nativo **por ora** | Custo/benefício: dias de Swift para precisão pior que a dos Atalhos |
| ✅ Atalhos como medição | Zero código nativo, usa a API que já existe, intervalos reais |
| ✅ Servidor casa open/close | O cliente não tem estado confiável |
| ✅ Subcontar em vez de estimar | O sistema **nunca** inventa tempo |
| ✅ Push via Expo | Já funciona; `projectId` do EAS existe |

---

## 5. Perguntas de pesquisa (o que investigar)

Ordenadas por impacto potencial.

1. **Shield + ação customizada = "pagar para liberar"?**
   `ManagedSettings` consegue bloquear apps (shield). Existe
   `ShieldActionExtension` para colocar botões na tela de bloqueio. **É possível
   que a ação chame nossa API, debite ouro e levante o shield por N minutos?**
   Quais os limites (rede na extension, tempo de execução, persistência)? Este é
   o caminho mais promissor para a zona 4 no iPhone. 🔍

2. **App Intents em vez de HTTP direto no Atalho.**
   Hipótese: em vez de o atalho fazer o POST, ele invoca um **App Intent do
   nosso app**. O app teria estado, fila e retry — resolvendo a perda de eventos
   (3.2.4) e talvez o pareamento. Investigar se um App Intent invocado por
   automação roda de forma confiável em background e quanto tempo tem. 🔍

3. **DeviceActivity: dá para extrair números hoje?**
   Reconfirmar 3.1.1 nas versões atuais do iOS: existe alguma forma suportada de
   o app ler os totais (novas APIs, `DeviceActivityResults`, etc.)? Se sim, muda
   toda a avaliação. 🔍

4. **Precisão real dos thresholds** (3.1.3): quantos eventos podem ser agendados,
   qual a granularidade mínima, qual a taxa de perda observada na prática.

5. **Tokens → identificador estável** (3.1.2): existe forma suportada de mapear
   um `ApplicationToken` para algo que possamos casar com nossos matchers?

6. **Supervisão / MDM em dispositivo pessoal.** Um iPhone próprio pode ser
   supervisionado (Apple Configurator). Isso destrava restrições gerenciadas que
   normalmente exigem MDM corporativo? Vale o trade-off (apagar o aparelho na
   supervisão)? 🔍

7. **Safari content blocker** para o item 4 (palavras): viável bloquear por
   padrão de URL e recarregar as regras a partir do app após uma compra de
   liberação? Cobre só Safari — isso é suficiente?

8. **Alternativas mais leves**: Focus/Modos de Concentração, Live Activities,
   Widgets — alguma expõe sinal de uso ou permite intervenção útil?

---

## 6. Restrições que qualquer solução precisa respeitar

Estas vêm da arquitetura já construída e testada:

- **Contrato de ingestão**: intervalos fechados com UUID gerado no cliente
  (`POST /tracking/ingest`, idempotente) **ou** eventos open/close
  (`POST /tracking/event`). Autenticação por token de dispositivo `dvc_`.
- **O servidor é a autoridade do relógio**: `ended_at` é clampado, intervalos
  com mais de 7 dias ou 4h são descartados, `seconds` é recalculado no servidor.
- **Nunca inventar tempo**: na dúvida, subcontar. Opens órfãos são descartados.
- **Fontes do iPhone são separadas** das do PC (`kind: 'app'`, matcher próprio) —
  franquias independentes por contexto, por decisão.
- **Bloqueio nunca proíbe**: tem preço. A liberação é uma compra debitada no
  ledger (`POST /tracking/unlock`) e é **recusada** sem saldo.
- **Modos de uso** (`active` / `parallel` / `audio`): o iPhone hoje só produz
  `active`; qualquer solução nova deve declarar o modo.
- Sem código nativo obrigatório na cadeia de medição, se possível — o app é
  Expo e o custo de manter módulos nativos é real.

---

## 7. Formato esperado da resposta da pesquisa

Para cada frente investigada:

1. **Veredito**: viável / inviável / viável com ressalvas.
2. **Evidência**: link para documentação oficial (ou nota de que não há
   documentação e a conclusão vem de comportamento observado).
3. **Custo**: linhas de Swift, entitlements, exigências de build/conta.
4. **Precisão esperada** da medição, se aplicável.
5. **Como plugaria** no contrato da §6.
