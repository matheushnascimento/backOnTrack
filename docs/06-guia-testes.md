# Guia de Testes do Back on Track

O M4 (Rede de Segurança) montou o alicerce: eslint enxergando o app (#128), jest-expo com job no CI (#134), e testes concretos cobrindo o `database.js`, `duration.js`, o parser do roadmap, a corrida da persistência do #108 e a função `api/feedback.js` com a compat do #116.

Este guia registra o **critério**, pra quem contribuir depois saber em segundos "isto exige teste? sim/não?", sem cair em teatro de cobertura.

## O critério, curto

> **Teste quando o custo do bug em produção for maior que o custo do teste.**

Isso pesa a favor de testar coisas que **quebram em silêncio** (não crashan, só se comportam errado) e coisas que os testers usam e a gente **não vai testar à mão em cada release**. Pesa contra testar coisas cujo bug é **imediatamente visível** ou **trivial**.

## Teste isto

- **Comportamento assíncrono**: o #108 foi uma corrida entre `startAutoLoad()` da persistência e o `useFocusEffect`. Nenhum linter pegaria; passar pelo navegador à mão passava em silêncio. Ver `tests/persistence-reactivity.test.jsx`.
- **Compat de payload/dados**: o #116 introduziu `environment`/`bundle`/`userAgent` mas manteve `device` do bundle antigo. Um `else if` a menos e o canal de feedback dos testers quebra sem aviso. Ver `tests/feedback-api.test.js` (caso "payload LEGADO").
- **Funções puras de domínio**: `hhmmToMinutes`/`minutesToHHMM`, `parseRoadmap`, `getToday`/`getByDate`. Barato de cobrir, alto valor: mudança acidental de comportamento é frequente e o teste roda em milissegundos.
- **Integração com serviço externo**: `api/feedback.js` chama a API do GitHub. Mocka o `fetch`, exercita guardas (401/500/400) e verifica o corpo enviado. Não bater no serviço real: teste rápido, determinístico, sem criar issue lixo.
- **Armadilhas conhecidas**: quando uma limitação existe de propósito (o `cleanText` do parser que engasga em parênteses aninhados), **trave por teste**. Se alguém "consertar" sem entender, o teste avisa.

## Não teste isto

- **Layout, estilo e cor**: caro e frágil. O eslint pega o que importa (referências mortas); o resto é visual, e a preview da Vercel + o build web servem melhor que snapshot.
- **UI que só passa props**: `MyButton`, `MyView`, `MyInput`. O valor é baixo; se quebrar, quebra em toda tela e você vê na hora.
- **Config e scripts one-shot**: `vercel.json`, `docker-compose.yml`, `notify-testers.mjs`. O próprio uso é o teste. Escrever teste pra config é encenação.
- **O que quebra visível ao abrir a tela**: não precisa de teste automatizado. O teste manual no navegador/device custa segundos e ainda pega o visual.

## Padrões técnicos do projeto

- Testes em `tests/*.test.{js,jsx}`. `npm test` roda tudo; job `Test` no CI (`.github/workflows/linting.yaml`).
- **jest-expo** com preset padrão. Detalhes de setup e armadilhas em `~/.claude/.../memory/jest-setup-gotchas.md`, que inclui o alinhamento do jest no 29, o peer `test-renderer`, e o `renderHook` **async** da RNTL 14.
- **Mockar `fetch`** com `jest.fn()` em `beforeEach`, restaurar em `afterEach`. Nunca bater em serviço real.
- Testes levam `// @ts-nocheck` no topo (globals do jest não são tipados; ADR-002).
- `no-undef` como **erro** no eslint, cobrindo todos os `.jsx`. Um `setTick` órfão como o do #126 quebra o CI antes do commit.

## Nota honesta sobre E2E

Enquanto os testers usam o app e reportam pela tela de feedback (#101, PR #102), o custo/benefício de um E2E automatizado **não fecha**: o próprio dogfooding cumpre o papel a custo zero, e cada issue reportada vira um teste unitário que trava a regressão específica (foi o que aconteceu com #108 → `persistence-reactivity.test.jsx` e #116 → `feedback-api.test.js`).

Se o número de testers crescer muito ou o dogfooding parar, revisite.

## Antes de mergear um PR novo

Uma pergunta rápida: **este PR muda algum comportamento das categorias em "Teste isto"?** Se sim, o teste existe (ou o PR adiciona um). Se não sabe, prove por injeção: remova o comportamento e veja se algum teste falha; se nenhum falhar, ele não estava coberto.
