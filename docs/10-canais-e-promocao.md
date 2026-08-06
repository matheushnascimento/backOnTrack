# Canais de update e promoção

Como uma mudança sai da `main` e chega no celular dos testers.

## O problema que isto resolve

Até aqui existia **um** canal (`preview`) apontando pra **uma** branch (`preview`), e todo merge na `main` publicava direto nela. Na prática o build chamado "preview" **era** produção: um merge chegava nos 6 testers em segundos, sem nenhum gate.

O histórico do projeto cobrou o preço disso:

- **#126** — regressão introduzida ao corrigir o #108. Passou por CI verde e foi pra produção via OTA; só apareceu quando um humano testou.
- **#218** — dep nativa nova sem bump de `version` deixou os testers em **crash loop**.
- **#239 / #249** — quebras de renderização de fonte no Android. Passaram por CI **e** pelo preview da Vercel, porque só se manifestam no APK nativo.

O ponto comum: nada disso é pegável por lint, teste ou preview web. Precisa rodar no APK — e antes disso, precisa existir um lugar onde rodar que não seja o celular do tester.

## Como funciona agora

```
merge na main
     │
     ▼
branch  staging  ──────> canal staging ──> BoT staging (seu aparelho)
     │
     │  [workflow "Promote Update", manual]
     ▼
branch  preview  ──────> canal preview ──> Back on Track (6 testers)
```

Duas coisas fazem isso funcionar sem ninguém reinstalar nada:

1. **O APK é assado com um _canal_, não com uma branch.** O canal aponta pra uma branch, e esse mapeamento vive no servidor. O APK 1.2.0 que os testers já têm segue no canal `preview`; mudamos só o que alimenta a branch `preview`.
2. **`eas update:republish` copia um grupo de update entre branches.** Promover não é rebuildar nem republicar do zero — é apontar pro mesmo artefato já validado.

## O fluxo do dia a dia

**1. Merge na main** → `publish-update.yaml` publica em `staging` automaticamente. Testers não recebem nada.

**2. Validar** → abrir o **BoT staging** no aparelho. Ele convive com o app de produção (applicationId diferente), então dá pra comparar lado a lado.

**3. Promover** → rodar a workflow **Promote Update** (aba Actions, `workflow_dispatch`). Ela pega o último grupo de `staging` e republica em `preview`. Os testers recebem na próxima abertura do app.

Merges se acumulam em staging até você promover — dá pra soltar um lote coerente em vez de pingar mudança solta.

## Rollback

Promoveu algo ruim? A workflow sempre pega o **último** de staging, então ela não serve pra voltar. Na mão:

```bash
# 1. achar o grupo bom anterior, na branch que os testers consomem
eas update:list --branch preview --limit 5

# 2. republicar ele por cima
eas update:republish --group <GRUPO_BOM> --destination-branch preview \
  --message "rollback: volta pro <descrição>"
```

Se o problema for mais grave (crash no boot, fronteira de módulo nativo), o martelo é mandar todo mundo de volta pro bundle embutido no APK:

```bash
eas update:roll-back-to-embedded --branch preview --runtime-version 1.2.0 --platform android
```

⚠️ **Ordem importa**: o expo-updates usa o **último** update da branch. Um `roll-back-to-embedded` é superado pela próxima promoção. Corrija o bug de verdade antes de promover de novo.

## O APK de staging

Cortado sob demanda — só quando uma mudança **nativa** precisa de validação (dep nova, plugin, ícone, splash). Mudança só-JS não precisa: o OTA de staging chega sozinho no BoT staging que você já tem instalado.

```bash
eas build --platform android --profile staging
```

O profile `staging` do `eas.json` seta `APP_VARIANT=staging`, e o `app.config.js` bifurca a identidade a partir daí:

|               | produção                             | staging                  |
| ------------- | ------------------------------------ | ------------------------ |
| nome          | Back on Track                        | BoT staging              |
| applicationId | `com.matheushnascimento.backOnTrack` | `…backOnTrack.staging`   |
| scheme        | `backontrack://`                     | `backontrack-staging://` |
| canal         | `preview`                            | `staging`                |

O que **não** muda: `slug`, `projectId` do EAS e `updates.url`. É o mesmo projeto EAS batendo no mesmo servidor — o canal é que separa.

### Por que o scheme também bifurca

Com os dois apps instalados sob o mesmo `backontrack://`, o Android não sabe qual abrir no callback do magic link — o login cairia no app errado, ou num seletor.

**Passo manual necessário** (uma vez, no dashboard do Supabase → Authentication → URL Configuration → Additional Redirect URLs):

```
backontrack-staging://**
```

Sem isso, login **no BoT staging** cai no fallback da Site URL e mostra `otp_expired`. O app de produção não é afetado.

## Ver também

- [04-roadmap-milestones.md](./04-roadmap-milestones.md) — M6 (sync) e M8 (estabilização/loja)
- A regra de **bump de `version` quando entra dep nativa** continua valendo, e é independente disto: OTA não atravessa fronteira de módulo nativo. Um APK de staging valida a mudança, mas não dispensa o bump.
