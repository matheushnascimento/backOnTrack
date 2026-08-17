# Roadmap de Milestones - Back on Track

Este roadmap foi **reescrito para um projeto em adaptação**. O "Back on Track" já existe, já roda no Android e já tem trabalho real investido. O papel do roadmap aqui é distinguir o que já está pronto, o que está inacabado, e o que o diagnóstico do código revelou como dívida a pagar.

Cada milestone tem um objetivo de saída claro. Sabe-se que terminou quando esse objetivo é verdade.

**Legenda:** ✅ pronto · 🟡 parcial/inacabado · ⬜ ainda não feito

**Nota sobre sincronização:** A ideia é: local + sync na nuvem desde o início. A arquitetura (ADR-004, TinyBase) já nasce pronta para isso, mas a milestone de _ativar e validar_ sync (M6) vem depois de o MVP local estar sólido. Isso evita empilhar duas curvas de aprendizado ao mesmo tempo (RN + sync), exatamente o tipo de gargalo que o projeto nasceu pra resolver.

**Nota de premissa (14/08/2026):** o projeto nasceu como veículo de aprendizado de React Native, e é essa premissa que explica o cuidado da nota acima em não empilhar duas curvas ao mesmo tempo. Esse papel se esgotou. A partir do **M9**, o Back on Track é uma ferramenta pessoal de hábitos organizada por níveis, e as decisões passam a ser julgadas por isso: o que serve a quem usa, não o que ensina mais. Os milestones anteriores ficam como estão. São registro do que aconteceu, não promessa do que vem. Onde o M9 contradiz uma entrega antiga (a Home das 5 métricas, do M3 e da fatia 1 do M5-B), quem vale é o M9.

---

## M0: Fundamentos & Setup ✅ concluído

**Objetivo de saída:** ambiente rodando, projeto criado, navegação de pé.

- ✅ Ambiente configurado, app rodando no Android
- ✅ Projeto criado com Expo + Expo Router
- ✅ Navegação entre as telas das métricas (Expo Router, rotas em `app/`)
- ✅ Design system embrionário (`MyView`, `MyButton`, `Score`, `MyCheckbox`, `useThemedStyles`)
- ✅ `categoryUtils` centralizando metadados por métrica
- ✅ ESLint/Prettier configurados (`eslint.config.mjs`, Prettier + `eslint-config-prettier`, Husky e job de CI)

Essencialmente pronto. O que faltar aqui é pontual e não bloqueia o resto.

---

## M1: Sanear a Fundação (o trabalho real de agora) ✅ concluído

**Objetivo de saída:** o app persiste dados de verdade e renderiza correto no Android. É aqui que mora a correção das duas causas de "mais visual do que funcional".

Esta milestone não existia no plano original. Ela nasceu do diagnóstico do código, e é a mais importante do roadmap: ataca exatamente as raízes que derrubaram as versões anteriores.

- ✅ **Persistência:** persister TinyBase integrado (`infra/persistence.js` com Expo SQLite, `infra/persistence.web.js` com `localPersister`), store em `infra/database.js`, ligado no root via `useRegistrosPersistencia()` em `app/_layout.jsx`. Os dados não somem mais no reload.
- ✅ **TypeScript incremental:** `checkJs` ligado no `tsconfig.json` (`allowJs` herdado da base do Expo), ADR-002 (#48); legados com `@ts-nocheck` (grandfather) e job `Types` no CI barrando arquivos novos.
- ✅ **Fundação de estilo:** cores consolidadas em `constants/Colors.js`, `tailwind.config.js` importando dela, `shadow` corrigida para objeto RN nativo (`elevation`), ADR-006.
- ✅ **Migrar estilo para NativeWind** (ver `docs/05-guia-migracao-estilo.md`): compartilhados migrados na #61 e telas na #65. Nenhum arquivo usa mais `StyleSheet`/`useThemedStyles` (o `hook/useThemedStyle.js` foi removido); cores por token com `dark:`, `MyHistory` deduplicado, stubs `(history)/*` reduzidos (retrabalho real no M3). `app.json` passou a `userInterfaceStyle: "automatic"`, ligando o tema claro/escuro real.

---

## M2: Modelo de Dados Unificado ✅ concluído

**Objetivo de saída:** as telas gravam no modelo `Registro` unificado, com CRUD completo.

- ✅ Implementar o `Registro` unificado na store (#63): schema com colunas `quantity`/`unit`/`note` + `details` para os extras específicos de cada tipo (nomes de topo em inglês, seguindo a padronização da #54). Durações (sono/exercício/estudo) guardadas em minutos (number); `constants/duration.js` converte `HH:MM` ↔ minutos.
- ✅ Mapear os campos ad-hoc (`score`, `min`/`max`/`ideal`, `observation`→`note`, `training`/`cardio`) para o formato unificado (#63), sem migração destrutiva: dados antigos continuam renderizando por fallback de nomes (`note ?? observation`, `quantity ?? duration`).
- ✅ Ligar as telas ao `add`/`update`/`remove`/`getById`/`getAll` (#63): as 5 telas gravam e leem no modelo unificado, com **modo edição** via `?id=` na rota.
- ✅ **Extrair a tela de registro única** (#80/#81): as 5 telas viraram uma rota dinâmica `app/(metrics)/[metric].jsx` dirigida por config por métrica, sobre `MetricScreen` (base) + `registry` + `fields` reutilizáveis (`components/metrics/`). Matou a duplicação (~-346 linhas) e fecha o risco de reboot por "arquitetura que não escala"; adicionar métrica = adicionar config.

---

## M3: MVP Funcional (uso diário real)

**Objetivo de saída:** o papel pode ser aposentado.

- ✅ As 5 telas de registro rápido, sobre o componente-base unificado (#80/#81): rota dinâmica `[metric].jsx` + config por métrica sobre `MetricScreen`
- ✅ Tela "hoje" consolidando o progresso do dia (uma query só, graças à tabela única): landing vira o resumo do dia (`app/index.jsx`), lendo `getToday()` (uma passada em `records`, agrupa por `type`); barra "N de 5 métricas" + total consolidado por métrica. Sem metas diárias ainda. Painel de roadmap movido pra `app/roadmap.jsx` (#94)
- ✅ Histórico navegável por data: tela `app/history.jsx` que lê `getByDate()` (uma passada em `records`, agrupa por `type`) e navega dia a dia (◀/▶ + botão "Hoje", sem avançar pro futuro), reusando o `HistoryCard` (com Editar/Excluir) do `MyHistory`. O grupo-stub `(history)/*` foi removido em favor da rota única; link "Histórico" nos Utilitários da tela "hoje"
- ✅ Editar/excluir registros (#63): o `MyHistory` tem ações **Editar** (abre a tela via `?id=`) e **Excluir** (com confirmação) por registro
- ✅ Primeiro dia de uso real substituindo o papel, com 6 testers notificados via `notify-testers.mjs --send` disparando pela Evolution API em `/projects/evolution_api` (#111). Abriram o app, usaram, e reportaram bugs de verdade pela tela `app/feedback.jsx`, que POSTa numa função serverless (`api/feedback.js`, na Vercel) e abre a issue no GitHub sozinha com label `tester-feedback`, sem exigir conta no GitHub de ninguém (#101). Tela de admin de testers com tabela TinyBase local + exportação da lista (#109). O papel foi aposentado
- ✅ Triagem completa das issues reportadas no dogfooding: #108 (crash da Home na primeira abertura por corrida com o `startAutoLoad()` assíncrono, corrigido com `useTable`), #116 (identificação de ambiente no feedback: app vs navegador + user agent + bundle OTA), #126 (regressão introduzida ao corrigir o #108, `setTick` órfão travando o Excluir do histórico), #131 (banner "atualização pronta": o expo-updates baixava em silêncio e enganava os testers em bugs já corrigidos). Única `tester-feedback` remanescente é #115 (tema rosa), reclassificada como entrada do M5

---

## M4: Rede de Segurança (testes automatizados)

**Objetivo de saída:** uma regressão como a do #126 quebra o CI **antes** do merge, sem chegar no tester.

**Dívida reconhecida (atrasada), em pagamento.** Teste estava agendado no M7, atrás de Design System, Sync e QoL, com E2E marcado como "opcional", que na prática significa teste nunca. E os gates eram cegos justamente pro código do app: o eslint cobria `**/*.js` e o app é 22 `.jsx`; o `tsc` esbarra no `@ts-nocheck` de todo arquivo (ADR-002); o jest estava instalado mas sem config, sem script e sem job. **O CI verificava formatação e mensagem de commit, nada sobre o app funcionar.** Isso cobrou o preço: o #108 (corrida com o `startAutoLoad()` assíncrono) é comportamental e nenhum linter pegaria; e o #126, introduzido ao corrigi-lo, passou por CI verde e foi pra produção via OTA, e só apareceu quando um humano testou. Sem teste, "corrigido" é opinião. O eslint já enxerga o app (#128) e a infra de teste já roda no CI, com o próprio #108 coberto (#134); o resto segue abaixo.

- ✅ Infra: `jest-expo` + `@testing-library/react-native` configurados, script `test` e job `Test` no CI (#134). jest fixado no 29 (jest-expo 57 não roda no 30)
- ✅ Fazer o eslint enxergar o app (#128): cobre `.jsx` com `no-undef` como erro (teria barrado o #126) + `eslint-plugin-react-hooks`
- ✅ Testes das funções de domínio: `infra/database.js` (#134), `constants/duration.js` e o parser do roadmap `constants/roadmap.js` (#140), com a armadilha dos parênteses aninhados travada por teste
- ✅ Teste da corrida da persistência (#108): monta vazio, a store enche depois do mount, o consumidor via `useTable` atualiza sozinho, provado que falha contra o padrão antigo (#134)
- ✅ Teste da função serverless `api/feedback.js` (#137): guardas, montagem do corpo e compat do #116 (payload legado `device` vs novo `environment`), com o `fetch` mockado, provado que pega a regressão
- ✅ Registrar o alvo (#143): `docs/06-guia-testes.md` com o critério "custo do bug > custo do teste", "teste isto"/"não teste isto" ancorados nos bugs desta rodada (#108/#116/#126), padrões técnicos do projeto e a decisão consciente sobre E2E

---

## M5: Design System & Consistência de UI

**Objetivo de saída:** telas consistentes em claro/escuro e no web, sobre um conjunto único de tokens e componentes, sem estilo duplicado. É o que separa "funciona" de "parece v1".

- ✅ Auditar as inconsistências atuais (botões, cards, header, escala tipográfica, responsividade web) e registrar o alvo: `docs/07-auditoria-ui.md` (#149): 10 achados com arquivo/linha, dos quais 5 funcionais (borda invisível do `MyInput` no dark, divergência `useColorScheme` RN vs NativeWind, padding duplicado nas telas de métrica, `MyView safe` default vazando em `MyCheckbox`/`Score`, `flex-row` num `<Text>`) que servem de entrada pros próximos itens
- ✅ Tokens canônicos: raio, tipografia, espaçamento, sombra, cor, com fonte única em `docs/08-design-tokens.md`. Entregue em 5 fatias: **raio** (#154, `rounded-full`/`rounded-lg`/`rounded-md` por papel), **tipografia** (#157, escala custom em px no `tailwind.config.js`, corpo em 17px iOS-aligned, `font-size: 62.5%` removido), **espaçamento** (#160, grid 4px do Tailwind default sem fracionários), **sombra** (#163, 1 nível canônico com regras top-level/nested/controle), **cor** (#166, token semântico `danger` distinto do `secondary`). Antes das fatias, saíram os 5 **fixes funcionais** (#152) que a auditoria destacou, deixando chão sem ruído pras decisões de token
- ✅ Componentizar o que está duplicado. Entregue em 3 fatias: **Card + SectionLabel + FieldLabel** (#169): extraídos em `components/`, 6 telas topo-nível e 3 arquivos de métrica migrados, constantes duplicadas apagadas; **`MyButton` disabled canônico** (#172): contrato `disabled` embutido (`opacity-40`), 3 callsites (history/admin/feedback) simplificam; **largura dos forms de métrica** (#175): card outer do `MetricScreen` vira `<Card>` canônico, cards nested seguem `w-full`, as 5 telas ficaram com mesma largura visual. `HistoryCard` segue componente próprio (estrutura interna própria); `MyHeader` é item separado abaixo
- ✅ Revisar o `MyHeader` (papel de navegação vs. chips de métrica) e o alinhamento no web (#178). `MyHeader` = faixa de chips das 5 métricas, mantido só em telas metric-adjacent (Home, Histórico, `MetricScreen`). Admin/Feedback/Roadmap deixam de renderizar chips e ganham o header nativo do Expo Router (`headerShown: true` na `Stack.Screen`) com título + back arrow. Papel documentado em `docs/08-design-tokens.md`. Follow-up de UI aberto: efeito stretch no header ao selecionar chip (bug pré-existente, sem relação com o item)
- ✅ Identidade visual do "Back on Track" (tema, ícones), migrada do QoL. **Parte A entregue** (#181): `app.json` `name` vira "Back on Track" (display), `splash.backgroundColor` alinha com a paleta (`#F8F9FA`), wordmark discreto no rodapé da Home, e `docs/08-design-tokens.md` ganha seção "Identidade visual" com nome/slug/tagline/metáfora/tom de voz/paleta como marca. **Parte B entregue** (#228): os 4 assets (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`) substituídos pelo design "1c · Linha que sobe" do Claude Design (curva suave subindo + ponto verde ancorando "aqui, hoje"), SVG source em `assets/source/`, re-export via `./scripts/build-icons.sh` (ImageMagick), `adaptiveIcon.backgroundColor` alinhado com paleta (`#F8F9FA`)
- ✅ Validar claro/escuro e layout web em cada tela (#189). Passada sistemática em 3 passos: levantamento code-first pelo grep (pegou bug real de `MyIconButton` sem `dark:` variant na borda, mesmo padrão do #152, esquecido; corrigido inline), checklist por tela documentado em `docs/07-auditoria-ui.md` § "QA visual final (M5)" (11 telas × 2 temas × 2 widths com foco por tela), triagem confirmada no preview
- ✅ **M5-B: Repaginação completa via Claude Design** (fonte: `docs/09-design-v2.md`). Segundo turno do designer entregou o app inteiro: 9 mockups (Home, 5 registros, Semana, Ajustes, empty state) com paleta canônica + grays semânticos novos + Inter/JetBrains Mono. Entregue em 7 fatias todas mergedas via OTA no APK 1.1.1 (identidade visual do 1c já tinha shippado em #229): **fatia 0** foundation: tokens, fontes, docs (#233); **fatia 1** Home layout com 5 metric cards (#234); **fatia 2** shell restyle das telas de registro (#235); **fatia 2a** water quick-add bespoke (#236); **fatia 2b** sleep bespoke com dormiu/acordou (#237); **fatia 2c** exercise/feeding/study bespoke (#238); **fatia 3** tela Semana com strip de dias (#240); **fatia 4** Ajustes dedicado, aposenta MenuModal (#241); **fatia 5** empty state / retomada (#242). Follow-up de bug: `#239` corrigiu clipping da última letra no Android (font-weight + `letterSpacing` negativo com fontFamily custom). "Fatia 6" (APK 1.2.0) foi descartada, porque todo o design v2 chega via OTA no 1.1.1, cortar APK novo agora custaria reinstalação sem ganho funcional; próximo bump virá quando M7 pedir dep nativa
- ✅ **Follow-up do M5-B: edição pelo HistoryCard também no bespoke v2** (#256, fechado via #257). Buraco deixado consciente pelas fatias 2a+ do M5-B: `renderCustom` no `registry` só cobria criação; edição via `?id=` caía no shell legado (Score/OBS/Top/Bottom + tokens v1). Fechado em 5 fatias (água, sono, alimentação, exercício, estudo), e cada bespoke passou a aceitar `recordId`, hidratar via `getById` e salvar via `update`, preservando os campos legados do registro (score fora do range v2, min/max/ideal, unit, trainingTime). A fatia final aposentou o path legado inteiro: `MetricScreen` encolheu ~46%, `registry` encolheu ~80%, `components/metrics/fields.jsx` e `components/FieldLabel.jsx` foram deletados por falta de consumidores
- ✅ **Campos de horário: relógio analógico tátil** (#258). Os inputs HH:MM (bed/wake do sono, duração + hora de início do exercício, duração do estudo) eram texto livre, aceitavam qualquer coisa, e o `parseHHMM` era a única defesa antes do `Registrar`. Substituídos pelo `components/metrics/TimePickerField`: toque abre um Modal com face de relógio SVG: anel externo 1-12, interno 13-00 (24 alvos táteis), e após escolher a hora vira modo minuto (5-em-5). Fallback textual embaixo, com a mesma máscara HH:MM (digits only, colon automático, clamp 23/59) da fatia intermediária, cobre entrada precisa de minutos como "07". Puro SVG + Pressable, sem dep nativa (mantém OTA)

---

## M6: Sincronização em Nuvem

**Objetivo de saída:** os dados sobrevivem a perda/troca de aparelho.

- ✅ Escolher e configurar o Synchronizer do TinyBase. **Escolha feita** na ADR-009 (#192): WebSocket próprio no homeserver via `createWsSynchronizer` + `createWsServer` (Node/Docker), cliente migra `Store` → `MergeableStore`. Alternativas (PowerSync, Yjs, só backup, Cloudflare Durable Objects) descartadas com motivo. **Configurado** em 3 fatias: **fatia 1** cliente migrado pra `MergeableStore` (#195) sem quebrar comportamento (persisters em JSON mode); **fatia 2** server WS em Docker no homeserver com `createWsServer` + persister JSON por sala + smoke test round-trip local + testes automatizados (subprocess, cobre bugs de código sem depender de rede) + deploy via Cloudflare Tunnel `home server` existente (rota `backontrack-sync.mhdn.com.br` → `127.0.0.1:8787`, TLS público confirmado com smoke remoto) (#198); **fatia 3** cliente do app conecta via `useCreateSynchronizer` em `infra/sync.js`, com room ID por install (UUID gerado no 1º launch, persistido como value `syncRoomId`) isola testers; falha silenciosa se offline/URL vazia; `EXPO_PUBLIC_SYNC_URL=""` desliga o sync (#202). **Fechado depois:** compartilhar room entre devices do mesmo usuário (item de autenticação abaixo); **auto-reconnect do WS** (#263): backoff exponencial com jitter em `infra/sync-retry.js`, escuta `close`/`error` do socket direto porque `createWsSynchronizer` resolve a promise mesmo quando a conexão falha (foi assim que a quebra do ES256 passou semanas invisível), e volta do background reconecta na hora via `AppState`; **UI de status de sync**: linha "Sincronização" em Ajustes com ponto colorido + copy sem cobrança (offline não é erro: local-first, os registros sobem quando a conexão volta) e ação "Tentar de novo"
- 🟡 Autenticação/identificação do usuário. **Decisão feita** na ADR-010 (#205): Supabase Auth hospedado, magic link por email. Cliente ganha telas de login/logout + `SessionProvider`; server WS valida JWT no upgrade e deriva `roomId = user.id`; dados anônimos migram no 1º sign-in. Substitui o roomId aleatório por-install da fatia 3 do sync. **Fatia A entregue** (#207, PR #208): cliente Supabase + `SessionProvider` + telas login/callback (PKCE + hash-flow) + botão login/logout em Utilitários. SMTP custom via Resend (`contato@mhdn.com.br`) configurado no dashboard Supabase; env vars `EXPO_PUBLIC_SUPABASE_*` no Vercel (prod + preview + dev). **Fatia B entregue** (#212): server valida JWT no `verifyClient` do upgrade (HS256 via `node:crypto` e ES256 via JWKS do Supabase, #262), e enforça `sub === pathId`, senão saber o pathId de outro usuário bastaria pra entrar na sala dele. **Fatia C entregue** (#214/#217): cliente manda `?token=`, `roomId = user.id`, e a migração dos dados anônimos sai de graça pelo CRDT do MergeableStore: no 1º sign-in o synchronizer troca de sala e o merge sobe o que era local. **Falta:** flip do server pra `AUTH_MODE=required` (hoje `optional`). **Aviso aos testers já dado** (DM de 13/08, ver #277): a política é não guardar dado anônimo remotamente, e o flip aplica essa mesma regra, então não é consequência nova e não pede aviso próprio. **Pré-requisito de código resolvido** no #276 (o cold start abria conexão anônima antes da sessão resolver, o que depois do flip viraria falha em toda abertura). **Bloqueio remanescente: #278.** Hoje o client não distingue "rejeitado por falta de login" de "rede caiu", então o tester sem login veria "sem conexão" com um "Tentar de novo" que nunca funciona, e o backoff girando à toa
- 🟡 Validar sync em cenários reais: offline → online, dois dispositivos, reinstalação. **Parcial:** 2 clients simultâneos no mesmo room via TLS público provados end-to-end (`server/smoke-two-clients.js`, #204). **Falta:** rodar cenários no app RN real (offline→online, reinstall), que depende da fatia B do item de auth acima. **Primeira passada de validação feita pelo lado do server** (13/08, sem aparelho): a inspeção das salas em disco + logs achou dois defeitos de estado de sessão obsoleto, ambos na #275: cold start conectando anônimo antes de `ready`, e resume reconectando com `access_token` vencido (8 rejeições no log entre 06/08 e 12/08, transitórias). Sobra de faxina: 76 salas anônimas no disco, 54 praticamente vazias
- ⬜ Ajustar regras/permissões do lado do transporte escolhido. Hoje: quem sabe o pathId conecta; após auth, JWT vira o gate. Reavaliar depois se aparecer necessidade além disso (ex: multi-user compartilhado, roles)

---

## M7: Quality of Life

**Objetivo de saída:** o app é bom de usar, não só funcional.

- ⬜ Gráficos/tendências simples por métrica (ex: água por semana)
- ⬜ Lembretes e notificações (`expo-notifications`)
- 🟡 Metas personalizadas por métrica: a metade de baixo saiu na fatia 0 do M9 (#288): as metas viraram dado no store (`constants/goals.js` + tabela `goals`), com alvo, tipo e cadência por métrica, e Ajustes já **exibe** os valores vindos de lá. Falta a edição pelo usuário, e hoje todo mundo roda no default
- ⬜ **Autocuidado como 6ª métrica** (novo valor de `tipo` + config de tela; sem estrutura nova)
- ⬜ Micro-interações e feedback visual ao registrar

---

## M8: Estabilização & Manutenção de Longo Prazo

**Objetivo de saída:** o app aguenta ser usado por anos, não só semanas.

- ⬜ Tratamento de erros e estados vazios
- ⬜ Exportação/backup de dados (JSON/CSV), com a rota de exportação já prevista
- 🟡 Build via EAS, instalado fora do Expo Go: o perfil `preview` gera **APK** instalável (`buildType: apk`, #71/#72); primeiro APK `preview` gerado e **validado num Android real**. Falta o build de **produção** (`.aab` + submit à loja).
- ⬜ Documentação de manutenção (como rodar, como publicar updates)

---

## M9: Jornada por Níveis

**Objetivo de saída:** o app sugere **um hábito por vez** e o nível acompanha o que a pessoa realmente fixou, em vez de mostrar as 5 métricas lado a lado e devolver pra ela a escolha (e a culpa por não dar conta de todas).

A referência declarada é o Fabulous, com uma recusa explícita: a progressão por níveis é gamificação, sim, mas a estética lúdica (confete, mascote, celebração) fica de fora. O registro é **reforço sóbrio**. E a queda é mais gentil que ofensiva: quebrar o fluxo **volta um nível**, sem zerar o histórico: o pico fica guardado, e o hábito de baixo continua valendo (cumulativo).

- ✅ **Modelo escrito antes do código** (#287): `docs/11-modelo-de-niveis.md` (13 seções) fixa portão, graduação, regressão e tom, embasado em literatura de hábito: Lally 2010 (mediana de 66 dias até automaticidade, faixa 18–254; **um dia perdido custa quase nada**), o efeito "que-se-dane" que transforma uma falha em abandono, e o Streak Freeze do Duolingo (−21% de churn: afrouxar melhorou engajamento **e** aprendizado). `docs/12-briefing-home-niveis.md` traduz isso em briefing pro Claude Design
- ✅ **Fatia 0: metas como dado + sinais de automaticidade** (#288): `constants/goals.js` (alvo, tipo `sum`/`presence`, cadência diária/semanal, ordem sugerida da jornada) e `constants/habitSignals.js` (consistência, regularidade por estatística circular, resiliência). Sono é `presence` de propósito: o portão é **comportamento, nunca resultado**. Ninguém controla se dormiu bem, só se foi deitar
- ✅ **Fatia 1: derivar o estado e lembrar o pico** (#290): `constants/journey.js` com `LOCKED`/`BUILDING`/`GRADUATED`/`PAUSED`, portão de graduação e detecção de quebra. A regressão **pausa o topo** (o hábito mais recente, não o mais antigo) e o pico persiste em `journeyPeakLevel`
- ✅ **Fatia 2: Home com card de foco + zona "resto do dia"** (#292): um hábito em destaque, os outros logo abaixo a um toque. Nada sumiu; a ordem é sugestão, não regra
- ✅ **Fatia 3a: momentos de subir de nível e de regressão** (#294): as duas telas que o modelo exige, com o texto da queda sem drama e sem cobrança
- ✅ **Fatia 3b: pular nível quando o histórico já sustenta** (#296): quem já resolveu sono não é obrigado a "provar" de novo. Pular **concede graduação**, então o hábito pulado entra no acumulado como qualquer outro
- ✅ **Fatia 3c: tela do hábito estável** (#298): onde mora o que virou automático. Chip cinza, nunca verde: status, não medalha
- ✅ **Promovido pros testers** em 17/08/2026 (canal `preview`, 1.2.0, por OTA, sem reinstalação)

**Fora de escopo, consciente:** os controles de previsualização de nível/estabilidade existem só em superfície de dev (`isDevSurface()`, ou seja `__DEV__` ou canal `staging`) e **não chegam ao APK dos testers**.

**Dívida reconhecida, aberta:**

- 🟡 **Limiares ainda provisórios.** `THRESHOLDS` está marcado como tal no código: os números saíram da literatura e de uma passada no histórico existente, não de medição do app rodando. A medição começou em 15/08/2026 e ainda não voltou número pra calibrar
- 🟡 **`RetomadaState` × lvl 0 se sobrepõem.** Quem passa 3+ dias sem registrar cai na tela de retomada em vez da Home nova. Foi deliberado deixar pra decidir vendo as duas rodando, só que agora isso atinge tester de verdade
- ⬜ **Deixar o usuário escolher o registro de reforço** (#286, sóbrio ou lúdico). Ideia registrada, depende de investimento, fora do escopo atual

**Sobre a ordem:** o M9 passou na frente do M7 e do M8, que seguem abertos. A causa foi a mudança de premissa registrada na nota do topo. O que o M9 entrega não estava previsto em milestone nenhum.

---

## Como usar este roadmap

Cada milestone deve ser concluído (ou conscientemente abreviado, com anotação do porquê) antes de avançar. Se um milestone crescer demais durante o desenvolvimento, é sinal de escopo vazando, então volte ao documento de Escopo & MVP antes de continuar. A exceção registrada é o M9, que nasceu de uma virada de premissa e passou na frente de milestones abertos; quando isso acontecer de novo, o certo é anotar o porquê aqui, não reordenar a lista em silêncio.

A ordem M1 → M2 é deliberada: **sanear a fundação (persistência + estilo) antes de unificar as telas.** Não adianta extrair um componente-base de tela que renderiza quebrado no Android ou que grava dados que somem no reload. Primeiro o chão firme, depois construir por cima.
