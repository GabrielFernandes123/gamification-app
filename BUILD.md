# Build do app para iPhone (sem App Store / sem TestFlight)

Build **ad-hoc** via EAS (distribuição interna). Instala direto no iPhone por QR code.
O perfil dura ~1 ano; quando expirar, é só rodar a build de novo.

## Pré-requisitos (já configurados)

- Conta Apple Developer paga, app registrado (`bundleIdentifier: com.gabriel.evolve`)
- EAS CLI (usado via `npx eas-cli@latest`), logado como `gabrielmfernandes`
- Perfil `preview` no `eas.json` com `distribution: internal` e `environment: preview`
- Variáveis `EXPO_PUBLIC_*` cadastradas no ambiente `preview` do EAS
  (o `.env` NÃO sobe pra build porque está no `.gitignore`)

## Comando principal

```powershell
npx eas-cli build -p ios --profile preview
```

## Passo a passo

### 1. Registrar o iPhone (só na primeira vez ou ao adicionar um aparelho novo)
```powershell
npx eas-cli device:create
```
- Escolha **Website** → abre um QR code / link
- Abra no **Safari do iPhone** → baixa o perfil
- **Ajustes → Geral → VPN e Gerenciamento de Dispositivos** → instale o perfil

### 2. Buildar
```powershell
npx eas-cli build -p ios --profile preview
```
Na primeira vez, responda aos prompts:
- **Log in to Apple account** → Apple ID + senha + código 2FA
- **Generate a new Apple Distribution Certificate?** → **Yes**
- **Select devices for the ad hoc build** → marque o(s) iPhone(s) registrado(s)

> Ad-hoc só funciona nos aparelhos registrados **no momento da build**.
> Adicionou um iPhone novo? Rode o passo 1 e depois uma nova build.

### 3. Instalar
- No fim, o EAS mostra um QR code / link → abra no **Safari do iPhone** → instalar

## Variáveis de ambiente (EXPO_PUBLIC_*)

Embutidas no bundle em build time. Como o `.env` é gitignorado, ficam guardadas no EAS.

```powershell
# Ver o que está cadastrado
npx eas-cli env:list --environment preview

# Atualizar a partir do .env local (depois de mudar algum valor)
npx eas-cli env:push preview --path .env --force
```

Variáveis usadas:
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — auth + storage (Supabase)
- `EXPO_PUBLIC_API_URL` — backend `gamificacao-api` (resto dos dados). **Precisa ser URL pública**, não localhost.

## Ícone

- Ícone do app = `assets/logo.png` (campo `icon` no `app.json`)
- O ícone é embutido no build → mudou o ícone, precisa **rebuildar**

## Perfis de build (eas.json)

- `development` → dev client, precisa do Metro rodando (`expo start`). Para desenvolver.
- `preview` → app standalone, abre sozinho sem PC. **É o usado para instalar no celular.**
- `production` → para publicar na loja.
