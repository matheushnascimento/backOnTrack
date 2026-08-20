# Contribuindo com o Back on Track

Guia curto pra manter consistência entre contribuidores (humanos e agentes).

## Convenções de idioma

O repositório usa **dois idiomas** de forma deliberada. A regra de qual vai onde:

### Inglês

- **Nome de branch:** `<tipo>/<N>-<descrição-em-inglês>`
  - Exemplos: `feat/80-metric-screen-base`, `fix/72-water-history-crash`, `refactor/154-tokens-radius`, `docs/187-contributing-conventions`
- **Mensagem de commit:** conventional commits em inglês.
  - Exemplos: `fix(ui): shorten dark border`, `refactor(ui): canonical radius scale`, `docs(readme): fix typo`
  - `commitlint` valida o formato (`.commitlintrc.*` / husky). O `subject` deve começar em **minúsculo**, então evite começar com nome de componente (`MyButton`, `MetricScreen`); parafraseie (`disabled state on MyButton` em vez de `MyButton disabled`).
- **Identificadores de código novos:** inglês como API exportada (`get`, `add`, `getToday`, `useRegistrosPersistencia`). Se um arquivo legado usa PT (`hidratar`, `linhas`), respeite o estilo local até que ele seja refatorado.

### Português

- **Título de issue / PR:** português.
- **Corpo/descrição de PR:** português.
- **Comentários no código:** português.
- **Strings de UI:** português (o app é PT-BR).
- **Documentação em `docs/`:** português.

### Rationale

Branch e commit são a **interface técnica do repo**, e aparecem em qualquer plataforma (GitHub UI, `git log`, notificações, releases) e ficam expostos a qualquer contribuidor futuro, incluindo ferramentas automatizadas. O restante (issue, PR, comentário, UI, doc) é conteúdo do **produto** ou da **discussão**, e mantém a voz PT-BR do projeto.

## Fluxo de trabalho

Cada mudança deveria passar pelo ciclo:

1. **Issue**: registrar o trabalho antes de codar (título/corpo em português)
2. **Branch**: criar a partir de `main` atualizada; nome em inglês
3. **Implementar**: código, testes, doc
4. **Commit**: conventional commits em inglês
5. **PR**: abrir contra `main` (título/corpo em português); aguardar CI verde
6. **Merge**: squash + delete branch depois que o CI passar (e revisão visual, quando aplicável)
7. **Fechar issue**: com um comentário do que foi entregue

`main` tem proteção: sem push direto, exige PR e CI verde. Não use `--force` sem alinhar antes.

## Rodando local

```bash
npm install
npm start          # Expo dev server (mobile via QR + web)
npm test           # jest-expo
npm run lint:eslint:check
npm run lint:prettier:check
npm run lint:types:check
```

## Onde encontrar mais

- Visão do produto, escopo, ADRs e roadmap: [`docs/`](docs/)
- Design system (tokens, componentes): [`docs/08-design-tokens.md`](docs/08-design-tokens.md)
- Estratégia de testes: [`docs/06-guia-testes.md`](docs/06-guia-testes.md)
