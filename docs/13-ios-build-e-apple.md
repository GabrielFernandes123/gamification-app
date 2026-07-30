# 13 · iOS — configuração da Apple e geração da build

> Guia operacional para colocar o bloqueio de apps do iPhone no ar. Cobre o que
> já está feito no código, o que fazer no portal da Apple, e como gerar/instalar
> a build de development.
>
> ⚠️ **Validade**: verificado em 25/07/2026 contra `react-native-device-activity@0.6.1`,
> Expo SDK 56 e eas-cli 16.28. Versões novas podem mudar o comportamento —
> reconfirme o que estiver marcado 🔍.

---

## 1. Resposta curta: qual a ordem?

**Configure a Apple à mão ANTES do build.** A ordem é:

```
1. código (plugin + app.json)          ← JÁ FEITO
2. portal da Apple: capabilities nos 4 App IDs
3. apagar os 4 provisioning profiles do EAS
4. eas build --profile development
5. instalar no iPhone + autorizar
```

A [doc do Expo](https://docs.expo.dev/build-reference/ios-capabilities/) lista
Family Controls e App Groups como capabilities que o EAS sincroniza sozinho —
**na prática, aqui, não sincronizou**. A primeira tentativa de build (25/07/2026)
falhou com os 4 targets reclamando de capability ausente, inclusive nos profiles
que o próprio EAS acabara de criar. Diagnóstico e correção em §6.

O que você precisa antes:

- conta Apple com papel **Account Holder ou Admin**. Papel *Developer* não pode
  modificar identifiers — e é a causa mais provável de o sync falhar em silêncio;
- `eas login` feito;
- o App Group `group.com.gabriel.evolve` já existe (criado pelo `expo-widgets`).

---

## 2. O que já está no código

Instalado `react-native-device-activity@0.6.1` e registrado em
[app.json](../app.json):

```json
[
  "react-native-device-activity",
  { "appGroup": "group.com.gabriel.evolve", "copyToTargetFolder": true }
]
```

O plugin criou a pasta `targets/` na raiz do app, com os fontes Swift dos três
targets (`ActivityMonitorExtension`, `ShieldAction`, `ShieldConfiguration`).
**Essa pasta deve ser commitada.**

Validado por `npx expo config --type introspect` (sem gerar `ios/`):

- entitlements do app principal: `com.apple.developer.family-controls: true` +
  App Group;
- **4 targets registrados no EAS, sem conflito**:

| Bundle ID | Origem |
|---|---|
| `com.gabriel.evolve.ActivityMonitorExtension` | device-activity |
| `com.gabriel.evolve.ShieldAction` | device-activity |
| `com.gabriel.evolve.ShieldConfiguration` | device-activity |
| `com.gabriel.evolve.widgets` | expo-widgets (já existia) |

Isso resolve a maior incógnita do spike da Fase 1: **`expo-widgets` e
`react-native-device-activity` coexistem** no mesmo projeto Xcode. Não precisou
de build para descobrir.

---

## 3. Gerar a build

```bash
cd gamificacao-app
eas login                                    # se ainda não estiver logado
eas build --profile development --platform ios
```

O perfil `development` já existe em [eas.json](../eas.json) com
`developmentClient: true` e `distribution: internal` — é exatamente o que
precisamos (build instalável no seu aparelho, sem TestFlight).

Na primeira execução o EAS vai perguntar sobre credenciais. Aceite o fluxo
gerenciado ("Let EAS handle it"). Ele vai:

1. pedir login da Apple;
2. registrar seu iPhone como device (se ainda não estiver) — vai abrir uma URL
   ou pedir o UDID;
3. criar os **4 App IDs** listados acima;
4. habilitar Family Controls + App Groups em cada um;
5. gerar certificado e os 4 provisioning profiles;
6. rodar o build na nuvem (~15–25 min).

No fim ele dá um QR code / link. Abra **no Safari do iPhone** e instale.

> Se você já tem builds de development antigos, este substitui — o dev client
> passa a ter o módulo nativo de Screen Time disponível.

---

## 4. Configuração no iPhone (uma vez)

1. Instale a build pelo link do EAS.
2. **Ajustes → Geral → VPN e Gerenciamento de Dispositivo** → confie no perfil
   de desenvolvedor (só na primeira instalação ad-hoc).
3. Abra o Evolve. Na primeira chamada de autorização o iOS mostra o diálogo de
   **Tempo de Uso** — toque em *Continuar* e autorize. Sem isso, nada de shield.
4. Confira em **Ajustes → Tempo de Uso** que o Evolve aparece como app com
   permissão.

Se você negar por acidente, a autorização não volta a pedir sozinha: vá em
Ajustes → Tempo de Uso e remova a restrição, ou reinstale o app.

---

## 5. Family Controls (Distribution) — só depois

O entitlement que o EAS habilita é o de **development**, suficiente para uso
pessoal com build interno. Se um dia você quiser TestFlight ou App Store, aí
precisa **pedir aprovação da Apple** para `Family Controls (Distribution)` via
formulário, para **cada um dos 4 bundle IDs**. Não é necessário agora.

---

## 6. A falha de capability — diagnóstico e correção

### O que aconteceu (build de 25/07/2026)

Os 4 targets falharam com variações de *"Provisioning profile doesn't include
the Family Controls (Development) capability"* e *"doesn't support the
group.com.gabriel.evolve App Group"*.

Os timestamps nos nomes dos profiles dão o diagnóstico:

| Profile | Criado em |
|---|---|
| `com.gabriel.evolve` (app) | **05/06/2026** — profile antigo, **reaproveitado** |
| `...ShieldConfiguration` | 25/07/2026 14:57 — criado neste build |
| `...ShieldAction` | 25/07/2026 14:57 — criado neste build |
| `...ActivityMonitorExtension` | 25/07/2026 14:58 — criado neste build |

Duas conclusões:

1. As extensions ganharam profiles **novos** e mesmo assim sem as capabilities →
   os **App IDs** não tinham as capabilities habilitadas. O passo "Synced
   capabilities" do EAS não fez efeito.
2. O app principal usou um profile de **junho**, anterior ao entitlement. Mesmo
   com o portal corrigido, um novo `eas build` pode reaproveitá-lo de novo —
   por isso é preciso **apagar o profile**, não só reconstruir.

A causa mais provável de (1) é o **papel da conta Apple**: papel *Developer* não
tem permissão para modificar identifiers, e o EAS segue o build em silêncio
quando o sync falha. Confira em
[App Store Connect → Users and Access](https://appstoreconnect.apple.com/access/users).

### Correção, na ordem

**Passo 1 — App Group existe?**
[Identifiers → App Groups](https://developer.apple.com/account/resources/identifiers/list/applicationGroup):
confirme `group.com.gabriel.evolve`. Se não existir, crie com esse identificador
exato.

**Passo 2 — capabilities nos 4 App IDs.** Em
[Identifiers → App IDs](https://developer.apple.com/account/resources/identifiers/list),
para **cada um** de:

```
com.gabriel.evolve
com.gabriel.evolve.ActivityMonitorExtension
com.gabriel.evolve.ShieldAction
com.gabriel.evolve.ShieldConfiguration
```

- marque **Family Controls**;
- marque **App Groups** e clique em **Configure** ao lado → selecione
  `group.com.gabriel.evolve` → *Continue*. Marcar App Groups sem escolher o grupo
  é o que gera o erro *"doesn't support the group…"*;
- **Save** → confirme o aviso de modificação.

> O `com.gabriel.evolve.widgets` não precisa de Family Controls, só do App Group
> (que já deve estar lá, senão os widgets não funcionariam).

**Passo 3 — apagar os 4 provisioning profiles.** Sem isto o EAS reusa os
existentes:

```bash
cd gamificacao-app
eas credentials
# Plataforma: iOS  →  Perfil: development
# → "Provisioning Profile: Delete"  →  apague o do app E o dos 3 targets
```

Alternativa pelo portal:
[Profiles](https://developer.apple.com/account/resources/profiles/list) → apague
os 4 `*[expo] com.gabriel.evolve*`.

**Passo 4 — rebuild.**

```bash
eas build --profile development --platform ios
```

Acompanhe o log: precisa aparecer **"✔ Synced capabilities"** e a criação de 4
profiles novos. Se o sync não aparecer, o problema é permissão da conta (acima).

### Se ainda falhar

Aí sim vale tentar declarar o entitlement de development explicitamente 🔍 —
é o contorno discutido em
[eas-cli#2715](https://github.com/expo/eas-cli/issues/2715):

```json
"ios": {
  "entitlements": {
    "com.apple.developer.family-controls": true,
    "com.apple.developer.family-controls.development": true
  }
}
```

Note que o plugin já injeta `com.apple.developer.family-controls` (confirmado por
introspect em §2), então isto só adiciona a variante `.development`.

### Outros erros comuns

| Erro | Causa |
|---|---|
| `You don't have permission to create identifiers` | conta sem papel Admin/Account Holder |
| build passa mas shield nunca aparece | autorização de Tempo de Uso não concedida (§4) |
| `already has a target with bundle identifier` | conflito de targets — não deve ocorrer, já validado em §2 |

---

## 7. O que vem depois da build

> **✅ Atualizado em 2026-08-04.** Esta seção dizia que "o app ainda não usa" o
> módulo nativo e listava a Fase 2 como pendente. **A Fase 2 está construída** — o
> que segue é o mapa do que existe, não do que falta.

Os cinco passos da Fase 2 do plano, e onde cada um vive:

1. seleção de apps (`FamilyActivityPicker`) casando token ↔ `matcher` de
   `tracked_sources` — `src/features/tracking/ios/ShieldPanel.tsx`;
2. sync `GET /tracking/policy` → threshold + bolsa no App Group —
   `src/features/tracking/ios/{policy,shieldSync,windows}.ts`, disparado no boot
   por `src/app/(app)/_layout.tsx`;
3. shield no callback de limiar, `ShieldConfiguration` com preço, `ShieldAction`
   consumindo grant — `shieldTheme.ts` + `SourceShieldRow.tsx`;
4. `POST /tracking/unlock` com `client_id` — armado em `shieldSync.ts`;
5. heartbeat em cada sync — `measure.ts` / `deviceToken.ts`.

**O que realmente falta da build** é só a etapa manual no portal da Apple
(habilitar HealthKit no App ID, regerar provisioning) — ver §5.

**Revisão do plano**: a v0.6.0 da lib trouxe `setWebContentFilterPolicy()` —
filtro de conteúdo web pelo próprio Screen Time, com modos `auto`/`specific`/`all`
e até 50 domínios por lista 🔍. Isso é **melhor que a extensão do Safari para
bloqueio por domínio**, porque vale em todos os navegadores e não depende de o
usuário habilitar extensão. Mas é **por domínio, não por palavra** — a extensão
do Safari continua sendo o caminho para palavra-chave. A Fase 3 deve usar as
duas: filtro de conteúdo para domínio, extensão para palavra.

---

## 8. Referências

- [iOS capabilities — Expo](https://docs.expo.dev/build-reference/ios-capabilities/)
- [react-native-device-activity](https://github.com/kingstinct/react-native-device-activity)
- [eas-cli#2715 — Family Controls build](https://github.com/expo/eas-cli/issues/2715)
- Plano completo: `11-tracking-tempo-de-tela.md`, `12-ios-limitacoes.md`
