<!-- bmad:context -->
<!-- Verificado em 2026-11-11 contra 67f9ff5. Mantido pelo bmad-project-context; edições dentro deste bloco são substituídas no refresh. O que quiser preservar, escreva fora dos marcadores. -->

## backOnTrack

App de hábitos por níveis em pt-BR, feito em Expo/React Native, com Android por OTA e web na Vercel. Os dados vivem no aparelho num MergeableStore do TinyBase e sincronizam por WebSocket com o servidor de `server/`, que guarda uma cópia de segurança; o login é pelo Supabase. Visão, decisões técnicas, roadmap e modelo de níveis estão em `docs/`; o trabalho é rastreado em issues do GitHub.

## Política

- Nunca mergear sem o OK explícito do mantenedor depois de validar no BoT Staging; CI verde não basta. Todo PR publica OTA no canal `staging` sozinho.
- PR que não muda o app: abra como draft com o rótulo `skip-staging` e só então rode `gh pr ready`, porque o staging publica no instante em que o PR sai do draft.
- Nunca rodar `npm run notify:testers:send` sem o mantenedor aprovar o texto exato da mensagem.
- Nunca imprimir segredo nem telefone de tester (`.env`, chaves VAPID, endpoint e chaves de push, `EVO_APIKEY`); para saber se uma variável existe, teste a presença sem exibir o valor.
- Branch e subject de commit em inglês, conventional commits, branch no formato `<tipo>/<N>-<descricao>`; issue, PR, comentário de código, UI e `docs/` em português.
- Sem travessão de prosa e sem a antítese "não é X, é Y", em código, doc, issue, PR e mensagem; `node scripts/check-em-dash.js` barra o travessão, e a antítese só a revisão pega.

## Onde estão as coisas

- Store, schema e escrita de registros: `infra/database.js`.
- Roadmap: `docs/04-roadmap-milestones.md` é a fonte única e a tela `/roadmap` deriva dele; atualize-o quando a entrega mudar o que ele afirma.
- Fluxo com o BMad e a customização do `bmad-build`: `docs/13-fluxo-bmad.md`.

## Rodar e verificar

- Não existe `npm run lint`; antes de dar por pronto rode `npm run lint:prettier:check`, `npm run lint:eslint:check`, `npm run lint:types:check`, `npm run lint:text:check` e `npx jest`.
- Teste de tela usa a RNTL 14, em que `render` e `fireEvent` são async: use `await` nos dois, senão o erro vira `getByLabelText is not a function`. Tela que precisa de SafeArea usa `renderRouter` de `expo-router/testing-library`.
- Dependência instalada no host derruba o container `backontrack-web` (`PluginError: Failed to resolve plugin`), porque o `node_modules` dele é um volume próprio; rode `docker compose run --rm web npm ci`.
- Variável `EXPO_PUBLIC_*` entra no bundle durante o build: mudar o valor na Vercel exige redeploy.

## Convenções que fogem do padrão

- Dependência nativa nova (módulo nativo, plugin, splash, ícone) exige subir `version` no `app.json` no mesmo PR: o `runtimeVersion` segue a versão, e OTA com módulo que a APK não tem derruba o app dos testers em loop.
- Função ou valor novo precisa de consumidor na tela: procure o callsite por grep antes de dar por pronto e deixe um teste que toque a tela.
- Para apagar registro sincronizado, use `delRow` num MergeableStore carregado com o conteúdo da sala, que gera lápide; apagar direto em `server/data/` não adianta, porque o aparelho reenvia a linha.

## Armadilhas conhecidas

- `update()` em `infra/database.js` reconstrói o `details` e descarta em silêncio o campo que não recebe: ao criar campo novo, repasse em todo callsite e teste os dois sentidos.
- Mergear com `--delete-branch` fecha o PR empilhado sobre aquela branch, e ele não reabre: rode antes `gh pr edit <N> --base main` no PR de cima.
- Última letra cortada no Android com a Inter vem de `Text` encolhido ao conteúdo, em geral por `items-center` no pai: dê largura de layout ao `Text` com `text-center`. Peso, `letterSpacing`, `underline` e carregamento da fonte já foram culpados e não eram a causa.

<!-- /bmad:context -->
