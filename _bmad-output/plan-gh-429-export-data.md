---
title: "Exportar os dados em JSON e CSV"
type: feature
ticket: ""
created: "2026-11-12"
status: built
baseline_revision: "8d0c069443cdb10099877f9bf34c607228311cd5"
route: full
route_source: auto
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: ["{project-root}/AGENTS.md"]
---

<frozen-after-approval reason="human-owned intent: do not modify unless human renegotiates">

## Intent

**Problem:** A pessoa não tem como tirar uma cópia própria do que registrou. O original fica no aparelho e a cópia do servidor tem os campos sensíveis cifrados (issue #429, item do M8).

**Approach:** A tela `/export`, que hoje é um placeholder ligado em Ajustes, passa a gerar um JSON completo e um CSV dos registros. No Android o arquivo sai pelo compartilhamento do sistema (`expo-file-system` + `expo-sharing`, decisão do usuário: caminho 1, com `version` 1.5.0 no `app.json`); na web, por download.

## Boundaries & Constraints

**Always:**

- Campo cifrado sai aberto quando a proteção está destravada. Travado, sem proteção ou ilegível: o campo é omitido, o arquivo diz o que ficou de fora e a tela avisa. Nunca sai texto cifrado.
- O JSON traz registros (hidratados, com o `details` espalhado), metas, plano de remédios, metas do autocuidado, peso, degraus e horário da higiene do sono e o nome de exibição.
- `version` do `app.json` vai de 1.4.0 pra 1.5.0 no mesmo PR (dependência nativa nova).

**Never:**

- Exportar a tabela `testers` (telefones), os pacotes `e2eKeys`, o `syncRoomId` ou as preferências do `localStore`.
- Importação e exportação automática ou agendada.
- Escrever no store a partir da exportação.

## I/O & Edge-Case Matrix

| Scenario                  | Input / State                                          | Expected Output / Behavior                                                                                                            | Error Handling         |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Destravado                | registros de todas as métricas, remédios, peso         | JSON com tudo aberto; CSV com uma linha por registro, autocuidado com tipo e nota                                                     | Sem erro               |
| Travado                   | proteção criada e travada                              | Autocuidado sem tipo e nota, remédios, metas do autocuidado e peso omitidos; `omitidos` lista cada um; aviso com "Abrir a proteção ›" | Sem erro               |
| Sem proteção              | nada cifrado                                           | Exporta tudo que existe; nenhum aviso                                                                                                 | Sem erro               |
| Ilegível                  | campo que não decifra com a chave                      | Campo omitido e contado em `omitidos`                                                                                                 | Sem erro               |
| Store vazio               | nenhum registro                                        | JSON com listas vazias; CSV só com o cabeçalho                                                                                        | Sem erro               |
| Compartilhar indisponível | `Sharing.isAvailableAsync()` falso, ou a escrita falha | Mensagem na tela, nada some                                                                                                           | Captura e mostra texto |

</frozen-after-approval>

## Code Map

- `app/export.jsx` -- placeholder "Hello World!"; vira a tela. Já registrada em `app/_layout.jsx:110` ("Exportação") e chamada por `app/ajustes.jsx:545`.
- `infra/database.js` -- `store`, `getAll(type)`/`get` usam `hidratar` (privado); tabelas `records`, `goals`, `meds`, `hygieneSteps`; valores `displayName`, `selfcareGoals`, `bodyWeight`, `hygieneTarget` (conferir os nomes no `setValuesSchema`). Não mudar o schema.
- `constants/selfcare.js` -- `lerRegistro(chaves, registro)` devolve `aberto|travado|ilegivel`; aceita linha crua ou hidratada.
- `constants/medPlan.js` -- `remediosDaTabela(chaves, tabela)` e `lerRemedio`.
- `constants/selfcareGoals.js` -- `lerMetas(chaves, protegido)`; `constants/bodyWeight.js` -- `lerPeso(chaves, protegido)`.
- `infra/useProtection.js` -- `useProtection()` → `{status: "sem-protecao"|"travado"|"destravado", chaves}`.
- `components/categoryUtils.jsx` -- `CATEGORY_MAP[type].displayName` ("água", "sono"…) pro rótulo no CSV.
- `components/GoalEditModal.jsx` -- modelo do aviso travado com "Abrir a proteção ›" → `router.navigate("/protecao")`.
- Convenção de plataforma: par `infra/x.js` + `infra/x.web.js` (ver `infra/webPush.js`).
- `tests/body-weight.test.js` -- como criar chave real nos testes (`createKeyBundle`).

## Tasks & Acceptance

**Execution:**

- [ ] `package.json`, `package-lock.json` -- `npx expo install expo-file-system expo-sharing` -- versões compatíveis com o SDK 57.
- [ ] `app.json` -- `version` 1.5.0 -- regra de dependência nativa do `AGENTS.md`.
- [ ] `constants/dataExport.js` -- funções puras `montarExportacao({tabelas, valores, chaves, agora})` → objeto JSON e `paraCsv(exportacao)` → texto -- testável sem tela nem plataforma.
- [ ] `infra/exportFile.js` -- `salvarECompartilhar({nome, conteudo, mimeType})` com `File`/`Paths.cache` e `Sharing.shareAsync` -- Android.
- [ ] `infra/exportFile.web.js` -- mesma assinatura, `Blob` + `URL.createObjectURL` + `<a download>` -- web.
- [ ] `app/export.jsx` -- tela com estado da proteção, botões "Exportar JSON" e "Exportar CSV", aviso travado, mensagem de erro -- consumidor das duas camadas acima.
- [ ] `tests/data-export.test.js` -- matriz de I/O com chave real e o CSV (BOM, separador, aspas, acento).
- [ ] `tests/export-screen.test.jsx` -- mock de `@/infra/exportFile`; botão chama com nome e mime certos; aviso travado; erro mostrado.
- [ ] `docs/04-roadmap-milestones.md` -- linha 128 vira ✅ com a descrição do #429 e o APK 1.5.0.

**Acceptance Criteria:**

- Given a tela de Ajustes, when a pessoa toca "Exportar dados" e depois "Exportar JSON", then o Android abre o compartilhamento com `backontrack-AAAA-MM-DD.json` e a web baixa o mesmo nome.
- Given o CSV exportado, when aberto no Excel ou no Google Planilhas em pt-BR, then colunas separadas e acentos corretos.
- Given a proteção travada, when a tela abre, then ela diz o que vai ficar de fora antes de exportar.

## Design Notes

- CSV: UTF-8 com BOM (o Excel só lê acento assim), separador `;` e decimal com vírgula, que é o que o Excel pt-BR espera. Colunas: `data`, `hora`, `habito`, `quantidade`, `unidade`, `nota`, `detalhes` (JSON compacto dos extras, com o tipo e a nota do autocuidado abertos). Aspas dobradas em campo com `;`, aspas ou quebra de linha.
- JSON: `{formato: "backontrack-export", versao: 1, geradoEm, omitidos: [...], registros, metas, remedios, metasAutocuidado, peso, higiene, nome}`. `versao` serve à futura importação.
- Data e hora do CSV no fuso local, pelo `date` do registro.

## Verification

**Commands:**

- `npx jest` -- expected: tudo verde, com os dois testes novos.
- `npm run lint:prettier:check && npm run lint:eslint:check && npm run lint:types:check && npm run lint:text:check` -- expected: sem erro.
- `docker compose run --rm web npm ci` -- expected: o `backontrack-web` volta a subir com as deps novas.

**Manual checks (if no CLI):**

- Validação do usuário: no Android exige APK 1.5.0 de staging (`eas build --platform android --profile staging`); na web, o preview da Vercel.

## Implementation Notes

- A hora do CSV vem do `createdAt`, e o dia, da `date`, desviando da nota de design: a correção de hora (#336) só mexe no `createdAt`, e a tela do histórico mostra essa hora. Data no CSV em `DD/MM/AAAA`.
- O plugin de config do `expo-sharing` ficou de fora: ele só serve pra receber compartilhamento no app.
- `expo install` subiu ferramentas transitivas dentro do SDK 57 (`@expo/config-plugins` 57.0.6 → 57.0.12, `xcode` 4, `glob` 14).

## Review Triage Log

Passada 1 (lente `quick`): 4 medium/low corrigidos, 1 low corrigido no texto, 3 adiados.

| achado                                                                      | veredito                     | rota          | evidência                                                                                                                               |
| --------------------------------------------------------------------------- | ---------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Ordem das linhas do CSV usa `date` e a hora mostrada usa `createdAt`        | low                          | patch         | `setRecordTime` (`infra/database.js:210`) só grava `createdAt`; registro corrigido sai fora de ordem no dia.                            |
| Nota começando com `=`, `+`, `-`, `@` vira fórmula na planilha              | medium                       | patch         | `campoCsv` só trata `;`, aspas e quebra de linha; "- dor de cabeça" abre como `#NOME?`.                                                 |
| Aviso e link dependem do `status` global, e não do `motivo` de cada omitido | low                          | patch         | `statusDaProtecao` olha só o pacote principal (`constants/e2eKeyring.js:84`); um segundo pacote travado cai no texto errado e sem link. |
| Botão secundário não parece desativado                                      | low                          | patch         | O `className` do `secundario` ignora `desativado`.                                                                                      |
| Texto "O JSON leva tudo" e estado da jornada fora da exportação             | low                          | patch (texto) | Os valores `journey*` não são exportados; o texto promete tudo. Incluir o estado fica pra issue da importação.                          |
| Download no PWA do iPhone pode não funcionar                                | maybe-false (medium se real) | defer         | Só um iPhone com o PWA instalado decide; vai pros passos de validação.                                                                  |
| Identificadores exportados em português contra o `CONTRIBUTING.md`          | low                          | defer         | A regra escrita diverge da prática dos módulos vizinhos (`lerPeso`, `remediosDaTabela`); reconciliar edita um arquivo de regras.        |
| Lockfile subiu ferramentas de prebuild                                      | maybe-false (medium se real) | defer         | Só o build EAS da APK 1.5.0 de staging revela regressão; vai pra descrição do PR.                                                       |
