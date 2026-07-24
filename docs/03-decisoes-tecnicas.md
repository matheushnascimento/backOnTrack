# Decisões Técnicas (ADR) - Back on Track

Cada entrada documenta uma decisão de arquitetura: o contexto, a decisão tomada, alternativas consideradas e as consequências. Pesquisado com base no estado do ecossistema em julho de 2026.

**Nota de contexto:** o projeto já tinha código existente quando ADR-002 e ADR-004 foram escritos pela primeira vez. Então as duas entradas foram revisadas logo em seguida. Isso é comportamento esperado de um ADR, não um erro: a decisão registrada é a mais atual, o histórico de revisão fica documentado dentro da própria entrada.

---

## ADR-001 — Framework: Expo

**Contexto:** React Native é novo pra você; o objetivo inclui aprender de forma sólida, sem se perder em configuração nativa antes de aprender o essencial.

**Decisão:** Expo (managed workflow com development builds), criado via `npx create-expo-app@latest`.

**Alternativas consideradas:** React Native CLI puro (bare) — descartado por exigir configuração nativa (Xcode/Android Studio) desde o dia 1, aumentando a curva de aprendizado sem benefício proporcional pra este projeto.

**Consequências:** builds em nuvem via EAS (sem depender de Xcode local), acesso a um SDK curado de módulos nativos, possibilidade de "ejetar" partes específicas no futuro se necessário. SDK atual: 57.

---

## ADR-002 — Linguagem: JavaScript, com tipagem incremental opcional

**Status:** revisado. A versão original desta entrada recomendava TypeScript pleno desde o commit inicial — decisão feita antes de eu saber que o código existente já está em JavaScript e funcionando. Reescrever um app que já anda só pra trocar a linguagem é custo sem retorno proporcional.

**Contexto:** você já sabe programar; tipagem estática ajudaria na parte que é nova (RN), mas o projeto já existe em JS.

**Decisão:** manter JavaScript no código existente. Para ganhar checagem de tipos sem migrar arquivo por arquivo, usar o modo `checkJs` do TypeScript (`jsconfig.json`/`tsconfig.json` com `allowJs` + `checkJs`), documentando tipos via comentários JSDoc onde fizer sentido — sem renomear nenhum `.js` para `.tsx`.

**Alternativas consideradas:** migração completa para TypeScript (recomendação original) — mantida como opção futura, não bloqueante. Arquivos novos podem nascer em `.ts`/`.tsx` se for mais natural no momento, sem forçar a base existente.

**Implementação (#48):** `allowJs` (já vinha da base do Expo) + `checkJs` ligados no `tsconfig.json`. Para não migrar à força, os arquivos legados que ainda não passam no `checkJs` foram marcados com `// @ts-nocheck` (grandfather) — a checagem some só naquele arquivo, e o marcador deve ser removido quando o arquivo for tipado. Arquivos **novos** nascem checados e são barrados no CI (job `Types` em `linting.yaml`, via `npm run lint:types:check`) se tiverem erro de tipo.

---

## ADR-003 — Navegação: Expo Router

**Contexto:** navegação é uma das primeiras decisões estruturais de qualquer app RN.

**Decisão:** Expo Router (roteamento por arquivos, construído sobre o React Navigation).

**Alternativas consideradas:** React Navigation configurado manualmente — descartado como ponto de partida porque hoje é o padrão para projetos novos no ecossistema Expo, já vem incluído no template, e reduz boilerplate justamente na parte que é nova pra você (estrutura de navegação).

**Consequências:** a estrutura de pastas (`app/`) passa a _ser_ a estrutura de navegação. Deep linking automático. Continua sendo React Navigation por baixo — os conceitos aprendidos são transferíveis caso precise de controle manual no futuro.

---

## ADR-004 — Armazenamento local + sincronização: TinyBase

**Status:** revisado. A versão original desta entrada recomendava Firebase/Firestore — decisão feita antes de eu saber que o projeto já usava TinyBase em produção. Pesquisado de novo com esse contexto: TinyBase não é uma pendência a corrigir, é uma escolha tecnicamente boa pra esse caso.

**Contexto:** o projeto já existente usa TinyBase como camada de dados, com resultados bons o suficiente pra manter o app "andando". A pergunta não é "qual escolher do zero", é "faz sentido manter" — e faz.

**Decisão:** manter TinyBase como store local reativo, com sincronização via os Synchronizers nativos da própria lib (CRDT nativo — `MergeableStore` — sem depender de Yjs/Automerge externos). O transporte específico de sync (WebSocket próprio, PowerSync, Electric, etc.) fica em aberto até a milestone de sincronização.

**Por que não trocar por Firebase:**

- TinyBase já resolve reatividade + persistência local + sync numa lib de ~6–13kB, sem dependências, com suporte first-class a Expo/React Native — a própria Expo publicou um guia oficial de como sincronizar apps local-first com TinyBase.
- O CRDT nativo resolve merge determinístico entre dispositivos sem depender de um backend proprietário — diferente do Firestore, não amarra o projeto a um serviço fechado da Google.
- Já está integrado e funcionando no código existente; trocar geraria retrabalho sem ganho técnico proporcional.

**Alternativas descartadas:** Firebase/Firestore (recomendação original desta entrada) — perderia o trabalho já feito sem resolver nenhum problema real que o TinyBase tenha.

**Consequências:**

- O item de sincronização do roadmap (M3) passa a ser "escolher e configurar o Synchronizer do TinyBase" em vez de "configurar Firebase + Auth".
- A persistência local pode usar o persister de Expo SQLite do próprio TinyBase, mantendo tudo dentro do ecossistema Expo.
- TypeScript continua opcional aqui: TinyBase já infere tipos a partir de schemas, então dá pra ganhar tipagem nos dados sem migrar o projeto inteiro (ver ADR-002).

---

## ADR-005 — Gerenciamento de estado: Zustand

**Contexto:** o app tem pouco estado verdadeiramente "global" — a maior parte dos dados vem diretamente da store do TinyBase.

**Decisão:** Zustand para estado de UI (ex: data selecionada, filtros, estado de onboarding). Os dados de domínio (registros) são consumidos diretamente via os hooks reativos do TinyBase (`ui-react`), sem duplicar em uma store separada.

**Alternativas consideradas:** Redux Toolkit — descartado por trazer mais estrutura/boilerplate do que o projeto precisa nesta escala. Context API puro — descartado por re-renderizar componentes de forma menos granular que o Zustand.

---

## ADR-006 — Estilização visual: NativeWind como sistema único

**Status:** decidido. A versão original desta entrada deixava a decisão em aberto para M2/M4 — mas a revisão do código existente revelou que o estilo já é uma fonte ativa de bugs no Android (a plataforma prioritária), então a decisão subiu de prioridade.

**Contexto:** o código atual mistura três coisas na mesma tela — `StyleSheet`/`useThemedStyles`, `className` (NativeWind) e valores de CSS web que **não são nativos do React Native** (`fontSize: "1.6rem"`, `boxShadow`, `width: "fit"`, `borderRadius: "100%"`). Esses valores renderizam no preview do navegador mas são ignorados ou quebram no Android — a causa mais provável de o app parecer "mais visual do que funcional". Além disso, as cores estavam duplicadas entre `constants/Colors.js` e `tailwind.config.js`, e a `shadow` central era uma string de `box-shadow` de CSS web propagada para todo o app.

**Decisão:** adotar **NativeWind** como sistema de estilo único, eliminando o `StyleSheet` das telas. Consolidar as cores numa fonte única (`constants/Colors.js`), com o `tailwind.config.js` importando dela em vez de repetir os valores. Corrigir a `shadow` para um objeto RN nativo (`elevation` no Android). Migração feita componente a componente, validando no Android antes/depois (ver guia de migração de estilo).

**Alternativas consideradas:**

- **StyleSheet puro** (trocar todo `rem` por número, remover NativeWind) — válido e mais "purista", mas descartaria o `tailwind.config.js` com temas já configurado e não aproveitaria o dark mode nativo do NativeWind (`dark:`).
- **Expo UI (componentes nativos)** — cedo demais; abstração maior do que o projeto precisa nesta fase.

**Consequências:**

- Uma fonte de verdade para cores; mudar o azul primário passa a ser edição em um lugar só.
- Dark/light mode resolvido pelo prefixo `dark:` do NativeWind, substituindo a lógica manual de `Colors[colorScheme]` espalhada por cada componente.
- Existe um passo de migração dedicado no roadmap (a dívida de estilo não é trivial e toca todas as telas).

---

## ADR-007 — Modelagem da store TinyBase: uma tabela, não seis

**Contexto:** o código de armazenamento existente já era genérico por `tableName` (uma função `add`/`get` reaproveitada entre métricas), mas nada garantia que cada tabela manteria o mesmo formato de dados ao longo do tempo — exatamente o tipo de fragmentação silenciosa que costuma virar a "arquitetura que não escala" dos reboots anteriores.

**Decisão:** uma única tabela `records`, com o campo `type` distinguindo as métricas (5 no MVP), e um `TablesSchema` do TinyBase (`setTablesSchema`) que obriga todo registro — de qualquer métrica — a manter o formato-base definido no documento de Escopo & MVP.

**Consequências:**

- A query da tela "hoje" (tudo que foi registrado hoje, não importa a métrica) vira uma leitura só, não cinco.
- O schema barra, em tempo de execução, qualquer registro que fuja do formato combinado — a fragmentação fica estruturalmente mais difícil de acontecer de novo.
- Campos específicos de cada métrica (ex: horário de dormir do sono) continuam possíveis via o campo `details`, sem abrir mão do formato comum.
- Adicionar a 6ª métrica (autocuidado) no futuro é só um novo valor de `type` — sem tabela nova, sem migração de schema.

---

## ADR-008 — Schema frouxo com `details` JSON durante o desenvolvimento

**Status:** decidido, e explicitamente temporário. Refina o ADR-007 (tabela única) para a fase de desenvolvimento — não o contradiz.

**Contexto:** o ADR-007 definiu uma tabela única `records` com um formato-base. Mas os dados reais de hoje são heterogêneos entre métricas: água tem `min`/`max`/`ideal`/`quantity`, exercício tem `training`/`cardio`/`trainingTime`/`duration`, estudo tem `duration`, todas têm `score`/`observation`. Definir agora um schema rígido que contemple todos esses campos exigiria decidir a forma final do dado **antes** de ter uso real que informe o que é necessário e o que sobra. Isso é decisão prematura — o tipo de over-engineering que trava o desenvolvimento sem retorno.

**Decisão:** durante o desenvolvimento (até o M2 fechar com uso real), usar um schema deliberadamente **frouxo**: apenas os campos comuns a todas as métricas ficam no nível superior do registro; tudo que é específico de cada métrica vai serializado como JSON num único campo `details`.

Campos de topo (estáveis, comuns a todas as métricas):

- `type` — "water", "sleep", "exercise", "feeding", "study"
- `date` — data do registro (ISO)
- `createdAt` — timestamp

Campo flexível:

- `details` — string JSON com todo o resto (`score`, `observation`, e os campos próprios de cada métrica). O schema não conhece nem valida o conteúdo de `details`.

**Por que assim, agora:**

- Não perde nenhum dado atual — todos os campos existentes cabem em `details` sem conversão.
- Não obriga a decidir a forma final do dado antes do uso real.
- Destrava a persistência (#47) imediatamente: dá pra persistir hoje, com os dados como estão.
- É reversível: quando o schema maduro chegar (M2+), lê-se o `details` JSON dos registros antigos e transforma-se no formato novo, uma vez só.

**Trade-off aceito:** com `details` como JSON string, perde-se validação de tipo por campo e queries diretas por campo interno (ex: "registros com `score > 3`" fica mais trabalhoso). Na fase de desenvolvimento isso não é necessário — query por campo interno é otimização de quando houver uso e volume. Troca-se validação futura por flexibilidade agora, conscientemente.

**Quando revisitar:** ao entrar no M2 (modelo unificado maduro), com base no que o uso real mostrar ser necessário/desnecessário. Este ADR existe justamente para que essa decisão temporária não seja confundida com descuido no futuro — o `details` como JSON solto é deliberado, não acidental.

---

## ADR-009 — Transporte de sincronização: WebSocket próprio no homeserver

**Status:** decidido. Fecha o ponto que o ADR-004 deixou explicitamente em aberto ("transporte específico de sync fica em aberto até a milestone de sincronização"). Escrito na fatia 1 do M6 (#192).

**Contexto:** o M6 quer que os dados sobrevivam a perda/troca de aparelho. A camada de dados (TinyBase) já suporta sync via `MergeableStore` (CRDT nativo) — o que falta é escolher o **transporte** (o que carrega bytes entre client e server) e onde ele mora. Contexto do projeto que pesa:

- **Escala pequena**: single-user hoje, 5-6 testers, longo prazo dezenas — não milhares.
- **Homeserver com Docker rodando** e ops estabelecidas (`docker-ce 29.6.1`, Evolution API já em produção lá — [[docker-snap-apparmor-broken]], [[evolution-api-testers-stack]]).
- **Objetivo:** minimizar ops de longo prazo. O app é pra durar anos.
- **Sync eventual (minutos) é aceitável** — realtime não é requisito.
- **Modelo de dados** (ADR-007/008): uma tabela `records` + `details` JSON, pouca superfície pra conflito de merge.

**Decisão:** WebSocket próprio no homeserver via `createWsSynchronizer` (client) + `createWsServer` (server) do TinyBase. Client migra de `Store` pra `MergeableStore` (pré-requisito de qualquer sync). Server roda em Node.js dentro do Docker do homeserver, atrás do reverse proxy que já existe, com persistência em arquivo (via `createFilePersister`) ou SQLite (via `createSqlite3Persister`) — decisão adiada pra próxima fatia, quando implementarmos.

**Alternativas consideradas:**

- **PowerSync** (SaaS ou self-hosted com Postgres). Sync engine maduro, backend Postgres, SDK Expo/RN oficial, Sync Rules pra filtrar dados por usuário. Descartado como default hoje por três motivos: (a) exige adicionar Postgres como novo serviço no homeserver (ou pagar SaaS) — mais uma dependência de ops sem ganho proporcional pra escala atual; (b) lock-in maior — o `createPowerSyncPersister` do TinyBase substitui o `expo-sqlite` persister e o modelo de dados vira SQLite + Sync Rules, mudança maior que trocar `Store` → `MergeableStore`; (c) reversível — se em algum momento a escala pedir (100+ users, Sync Rules complexos, queries analíticas fora do app), migrar do WS próprio pra PowerSync é possível, e adiar essa escolha até ter demanda concreta é mais barato do que assumir agora.
- **CRDT com Yjs** (`YjsPersister` + `y-websocket`/`y-webrtc`). Descartado por redundância: o `MergeableStore` do TinyBase já é CRDT nativo determinístico; adicionar Yjs por cima só faz sentido se precisar de features exclusivas do Yjs (rich text/drawing collab), o que não é o caso.
- **Só backup (export/import JSON)**, sem sync ativo. Alternativa mais barata e já prevista como item do M8 ("Exportação/backup de dados"). Não substitui sync — não resolve "usar em dois aparelhos ao mesmo tempo" nem restaura automaticamente ao reinstalar. Fica como fallback complementar, não como escolha do M6.
- **Cloudflare Durable Objects** (`WsServerDurableObject`). Zero ops, escala infinita, custo baixo em escala pequena. Descartado por ir contra o princípio "usar a infra que já tem" — introduzir Cloudflare como dependência nova quando o homeserver já resolve é assumir vendor lock-in de graça, e o tempo pra provisionar/aprender > tempo pra rodar um contêiner Node.

**Consequências:**

- **Positivo:** zero custo recorrente; owner completo do estado; menor delta de código (Store → MergeableStore + Synchronizer, sem trocar persister do client); zero lock-in de fornecedor; usa infra e prática de ops que você já tem.
- **Negativo aceito:** uptime do server é responsabilidade sua (o homeserver já é), reverse proxy + TLS (wss://) precisam ser configurados uma vez, reconnect/retry ficam por conta do que o TinyBase resolve (o essencial já vem pronto no `WsSynchronizer`, mas edge cases podem exigir cuidado). Server persistence via `createFilePersister` é rústica — se ficar apertado, dá pra trocar por `createSqlite3Persister` sem afetar o client.
- **Auth:** por enquanto o path do WebSocket é a "sala" (ex.: `wss://.../<userId>`). Sem autenticação real na primeira versão — dogfooding continua sendo os 5-6 testers conhecidos. Auth entra em fatia própria do M6 quando a escala/exposição pedir.
- **Migração:** o próprio `createMergeableStore` é compatível com `expo-sqlite` persister via `MergeableContentPersister` (ou o `Sqlite3Persister` server-side no server); os dados existentes de testers continuam válidos, só ganham metadados de CRDT.

**Quando revisitar:** se a escala passar de ~50 usuários ativos, se Sync Rules ficarem necessárias (particionar dados por permissão complexa), ou se o ops do homeserver se tornar problemático. Nesses casos, considerar PowerSync (SaaS ou self-hosted) — a migração exige troca de persister do client (ExpoSqlite → PowerSync), mas a shape do TinyBase Store persiste.

---

## Fontes consultadas

- https://docs.expo.dev/router/introduction/
- https://docs.expo.dev/versions/latest/
- https://www.shipnative.dev/blog/supabase-vs-firebase-react-native-2026
- https://dev.to/pockit_tools/supabase-vs-firebase-in-2026-the-honest-comparison-after-using-both-in-production-3e5
- https://www.pkgpulse.com/blog/react-state-management-2026
- https://tinybase.org/
- https://expo.dev/blog/how-to-synchronize-reactive-local-first-apps-with-tinybase
- https://doolpa.com/article/tinybase
- https://tinybase.org/api/persister-expo-sqlite/functions/creation/createexposqlitepersister/
- https://www.nativewind.dev/
- https://tinybase.org/guides/synchronization/ (ADR-009)
- https://tinybase.org/guides/synchronization/using-a-synchronizer/ (ADR-009)
- https://tinybase.org/guides/the-basics/architectural-options/ (ADR-009)
- https://tinybase.org/api/synchronizer-ws-client/interfaces/synchronizer/wssynchronizer/ (ADR-009)
- https://tinybase.org/api/persister-powersync/ (ADR-009)
- https://www.powersync.com/ (ADR-009)
