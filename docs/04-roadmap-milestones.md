# Roadmap de Milestones - Back on Track

Este roadmap foi **reescrito para um projeto em adaptação**,. O "Back on Track" já existe, já roda no Android e já tem trabalho real investido. O papel do roadmap aqui é distinguir o que já está pronto, o que está inacabado, e o que o diagnóstico do código revelou como dívida a pagar.

Cada milestone tem um objetivo de saída claro. Sabe-se que terminou quando esse objetivo é verdade.

**Legenda:** ✅ pronto · 🟡 parcial/inacabado · ⬜ ainda não feito

**Nota sobre sincronização:** A ideia é: local + sync na nuvem desde o início. A arquitetura (ADR-004, TinyBase) já nasce pronta para isso, mas a milestone de _ativar e validar_ sync (M6) vem depois de o MVP local estar sólido. Isso evita empilhar duas curvas de aprendizado ao mesmo tempo (RN + sync), exatamente o tipo de gargalo que o projeto nasceu pra resolver.

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

Esta milestone não existia no plano original — ela nasceu do diagnóstico do código. É a mais importante do roadmap: ataca exatamente as raízes que derrubaram as versões anteriores.

- ✅ **Persistência:** persister TinyBase integrado (`infra/persistence.js` com Expo SQLite, `infra/persistence.web.js` com `localPersister`), store em `infra/database.js`, ligado no root via `useRegistrosPersistencia()` em `app/_layout.jsx`. Os dados não somem mais no reload.
- ✅ **TypeScript incremental:** `checkJs` ligado no `tsconfig.json` (`allowJs` herdado da base do Expo), ADR-002 (#48); legados com `@ts-nocheck` (grandfather) e job `Types` no CI barrando arquivos novos.
- ✅ **Fundação de estilo:** cores consolidadas em `constants/Colors.js`, `tailwind.config.js` importando dela, `shadow` corrigida para objeto RN nativo (`elevation`), ADR-006.
- ✅ **Migrar estilo para NativeWind** (ver `docs/05-guia-migracao-estilo.md`): compartilhados migrados na #61 e telas na #65. Nenhum arquivo usa mais `StyleSheet`/`useThemedStyles` (o `hook/useThemedStyle.js` foi removido); cores por token com `dark:`, `MyHistory` deduplicado, stubs `(history)/*` reduzidos (retrabalho real no M3). `app.json` passou a `userInterfaceStyle: "automatic"`, ligando o tema claro/escuro real.

---

## M2 — Modelo de Dados Unificado ✅ concluído

**Objetivo de saída:** as telas gravam no modelo `Registro` unificado, com CRUD completo.

- ✅ Implementar o `Registro` unificado na store (#63): schema com colunas `quantity`/`unit`/`note` + `details` para os extras específicos de cada tipo (nomes de topo em inglês, seguindo a padronização da #54). Durações (sono/exercício/estudo) guardadas em minutos (number); `constants/duration.js` converte `HH:MM` ↔ minutos.
- ✅ Mapear os campos ad-hoc (`score`, `min`/`max`/`ideal`, `observation`→`note`, `training`/`cardio`) para o formato unificado (#63), sem migração destrutiva — dados antigos continuam renderizando por fallback de nomes (`note ?? observation`, `quantity ?? duration`).
- ✅ Ligar as telas ao `add`/`update`/`remove`/`getById`/`getAll` (#63): as 5 telas gravam e leem no modelo unificado, com **modo edição** via `?id=` na rota.
- ✅ **Extrair a tela de registro única** (#80/#81): as 5 telas viraram uma rota dinâmica `app/(metrics)/[metric].jsx` dirigida por config por métrica, sobre `MetricScreen` (base) + `registry` + `fields` reutilizáveis (`components/metrics/`). Matou a duplicação (~-346 linhas) e fecha o risco de reboot por "arquitetura que não escala"; adicionar métrica = adicionar config.

---

## M3 — MVP Funcional (uso diário real)

**Objetivo de saída:** o papel pode ser aposentado.

- ✅ As 5 telas de registro rápido, sobre o componente-base unificado (#80/#81): rota dinâmica `[metric].jsx` + config por métrica sobre `MetricScreen`
- ✅ Tela "hoje" consolidando o progresso do dia (uma query só, graças à tabela única): landing vira o resumo do dia (`app/index.jsx`), lendo `getToday()` (uma passada em `records`, agrupa por `type`); barra "N de 5 métricas" + total consolidado por métrica. Sem metas diárias ainda. Painel de roadmap movido pra `app/roadmap.jsx` (#94)
- ✅ Histórico navegável por data: tela `app/history.jsx` que lê `getByDate()` (uma passada em `records`, agrupa por `type`) e navega dia a dia (◀/▶ + botão "Hoje", sem avançar pro futuro), reusando o `HistoryCard` (com Editar/Excluir) do `MyHistory`. O grupo-stub `(history)/*` foi removido em favor da rota única; link "Histórico" nos Utilitários da tela "hoje"
- ✅ Editar/excluir registros (#63): o `MyHistory` tem ações **Editar** (abre a tela via `?id=`) e **Excluir** (com confirmação) por registro
- ✅ Primeiro dia de uso real substituindo o papel — 6 testers notificados via `notify-testers.mjs --send` disparando pela Evolution API em `/projects/evolution_api` (#111). Abriram o app, usaram, e reportaram bugs de verdade pela tela `app/feedback.jsx`, que POSTa numa função serverless (`api/feedback.js`, na Vercel) e abre a issue no GitHub sozinha com label `tester-feedback` — sem exigir conta no GitHub de ninguém (#101). Tela de admin de testers com tabela TinyBase local + exportação da lista (#109). O papel foi aposentado
- ✅ Triagem completa das issues reportadas no dogfooding: #108 (crash da Home na primeira abertura por corrida com o `startAutoLoad()` assíncrono, corrigido com `useTable`), #116 (identificação de ambiente no feedback — app vs navegador + user agent + bundle OTA), #126 (regressão introduzida ao corrigir o #108, `setTick` órfão travando o Excluir do histórico), #131 (banner "atualização pronta" — o expo-updates baixava em silêncio e enganava os testers em bugs já corrigidos). Única `tester-feedback` remanescente é #115 (tema rosa), reclassificada como entrada do M5

---

## M4 — Rede de Segurança: Testes Automatizados

**Objetivo de saída:** uma regressão como a do #126 quebra o CI **antes** do merge — não chega no tester.

**Dívida reconhecida (atrasada), em pagamento.** Teste estava agendado no M7, atrás de Design System, Sync e QoL, com E2E marcado como "opcional" — na prática, teste nunca. E os gates eram cegos justamente pro código do app: o eslint cobria `**/*.js` e o app é 22 `.jsx`; o `tsc` esbarra no `@ts-nocheck` de todo arquivo (ADR-002); o jest estava instalado mas sem config, sem script e sem job. **O CI verificava formatação e mensagem de commit — nada sobre o app funcionar.** Isso cobrou o preço: o #108 (corrida com o `startAutoLoad()` assíncrono) é comportamental e nenhum linter pegaria; e o #126, introduzido ao corrigi-lo, passou por CI verde e foi pra produção via OTA — só apareceu quando um humano testou. Sem teste, "corrigido" é opinião. O eslint já enxerga o app (#128) e a infra de teste já roda no CI, com o próprio #108 coberto (#134); o resto segue abaixo.

- ✅ Infra: `jest-expo` + `@testing-library/react-native` configurados, script `test` e job `Test` no CI (#134). jest fixado no 29 (jest-expo 57 não roda no 30)
- ✅ Fazer o eslint enxergar o app (#128): cobre `.jsx` com `no-undef` como erro (teria barrado o #126) + `eslint-plugin-react-hooks`
- ✅ Testes das funções de domínio: `infra/database.js` (#134), `constants/duration.js` e o parser do roadmap `constants/roadmap.js` (#140) — a armadilha dos parênteses aninhados travada por teste
- ✅ Teste da corrida da persistência (#108): monta vazio, a store enche depois do mount, o consumidor via `useTable` atualiza sozinho — provado que falha contra o padrão antigo (#134)
- ✅ Teste da função serverless `api/feedback.js` (#137): guardas, montagem do corpo e compat do #116 (payload legado `device` vs novo `environment`), com o `fetch` mockado — provado que pega a regressão
- ✅ Registrar o alvo (#143): `docs/06-guia-testes.md` com o critério "custo do bug > custo do teste", "teste isto"/"não teste isto" ancorados nos bugs desta rodada (#108/#116/#126), padrões técnicos do projeto e a decisão consciente sobre E2E

---

## M5 — Design System & Consistência de UI

**Objetivo de saída:** telas consistentes em claro/escuro e no web, sobre um conjunto único de tokens e componentes — sem estilo duplicado. É o que separa "funciona" de "parece v1".

- ✅ Auditar as inconsistências atuais (botões, cards, header, escala tipográfica, responsividade web) e registrar o alvo: `docs/07-auditoria-ui.md` (#149) — 10 achados com arquivo/linha, dos quais 5 funcionais (borda invisível do `MyInput` no dark, divergência `useColorScheme` RN vs NativeWind, padding duplicado nas telas de métrica, `MyView safe` default vazando em `MyCheckbox`/`Score`, `flex-row` num `<Text>`) que servem de entrada pros próximos itens
- ✅ Tokens canônicos: raio, tipografia, espaçamento, sombra, cor — fonte única em `docs/08-design-tokens.md`. Entregue em 5 fatias: **raio** (#154, `rounded-full`/`rounded-lg`/`rounded-md` por papel), **tipografia** (#157, escala custom em px no `tailwind.config.js`, corpo em 17px iOS-aligned, `font-size: 62.5%` removido), **espaçamento** (#160, grid 4px do Tailwind default sem fracionários), **sombra** (#163, 1 nível canônico com regras top-level/nested/controle), **cor** (#166, token semântico `danger` distinto do `secondary`). Antes das fatias, saíram os 5 **fixes funcionais** (#152) que a auditoria destacou — chão sem ruído pras decisões de token
- ✅ Componentizar o que está duplicado. Entregue em 3 fatias: **Card + SectionLabel + FieldLabel** (#169) — extraídos em `components/`, 6 telas topo-nível e 3 arquivos de métrica migrados, constantes duplicadas apagadas; **`MyButton` disabled canônico** (#172) — contrato `disabled` embutido (`opacity-40`), 3 callsites (history/admin/feedback) simplificam; **largura dos forms de métrica** (#175) — card outer do `MetricScreen` vira `<Card>` canônico, cards nested seguem `w-full`, as 5 telas ficaram com mesma largura visual. `HistoryCard` segue componente próprio (estrutura interna própria); `MyHeader` é item separado abaixo
- ✅ Revisar o `MyHeader` (papel de navegação vs. chips de métrica) e o alinhamento no web (#178). `MyHeader` = faixa de chips das 5 métricas, mantido só em telas metric-adjacent (Home, Histórico, `MetricScreen`). Admin/Feedback/Roadmap deixam de renderizar chips e ganham o header nativo do Expo Router (`headerShown: true` na `Stack.Screen`) com título + back arrow. Papel documentado em `docs/08-design-tokens.md`. Follow-up de UI aberto: efeito stretch no header ao selecionar chip (bug pré-existente, sem relação com o item)
- ✅ Identidade visual do "Back on Track" (tema, ícones) — migrada do QoL. **Parte A entregue** (#181): `app.json` `name` vira "Back on Track" (display), `splash.backgroundColor` alinha com a paleta (`#F8F9FA`), wordmark discreto no rodapé da Home, e `docs/08-design-tokens.md` ganha seção "Identidade visual" com nome/slug/tagline/metáfora/tom de voz/paleta como marca. **Parte B entregue** (#228): os 4 assets (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`) substituídos pelo design "1c · Linha que sobe" do Claude Design (curva suave subindo + ponto verde ancorando "aqui, hoje"), SVG source em `assets/source/`, re-export via `./scripts/build-icons.sh` (ImageMagick), `adaptiveIcon.backgroundColor` alinhado com paleta (`#F8F9FA`)
- ✅ Validar claro/escuro e layout web em cada tela (#189). Passada sistemática em 3 passos: levantamento code-first pelo grep (pegou bug real de `MyIconButton` sem `dark:` variant na borda — mesmo padrão do #152, esquecido; corrigido inline), checklist por tela documentado em `docs/07-auditoria-ui.md` § "QA visual final (M5)" (11 telas × 2 temas × 2 widths com foco por tela), triagem confirmada no preview

---

## M6 — Sincronização em Nuvem

**Objetivo de saída:** os dados sobrevivem a perda/troca de aparelho.

- ✅ Escolher e configurar o Synchronizer do TinyBase. **Escolha feita** na ADR-009 (#192): WebSocket próprio no homeserver via `createWsSynchronizer` + `createWsServer` (Node/Docker), cliente migra `Store` → `MergeableStore`. Alternativas (PowerSync, Yjs, só backup, Cloudflare Durable Objects) descartadas com motivo. **Configurado** em 3 fatias: **fatia 1** cliente migrado pra `MergeableStore` (#195) sem quebrar comportamento (persisters em JSON mode); **fatia 2** server WS em Docker no homeserver com `createWsServer` + persister JSON por sala + smoke test round-trip local + testes automatizados (subprocess, cobre bugs de código sem depender de rede) + deploy via Cloudflare Tunnel `home server` existente (rota `backontrack-sync.mhdn.com.br` → `127.0.0.1:8787`, TLS público confirmado com smoke remoto) (#198); **fatia 3** cliente do app conecta via `useCreateSynchronizer` em `infra/sync.js` — room ID por install (UUID gerado no 1º launch, persistido como value `syncRoomId`) isola testers; falha silenciosa se offline/URL vazia; `EXPO_PUBLIC_SYNC_URL=""` desliga o sync (#202). **Falta pro M6:** compartilhar room entre devices do mesmo usuário (item de autenticação abaixo), auto-reconnect do WS, UI de status de sync
- 🟡 Autenticação/identificação do usuário. **Decisão feita** na ADR-010 (#205): Supabase Auth hospedado, magic link por email. Cliente ganha telas de login/logout + `SessionProvider`; server WS valida JWT no upgrade e deriva `roomId = user.id`; dados anônimos migram no 1º sign-in. Substitui o roomId aleatório por-install da fatia 3 do sync. **Fatia A entregue** (#207, PR #208): cliente Supabase + `SessionProvider` + telas login/callback (PKCE + hash-flow) + botão login/logout em Utilitários. SMTP custom via Resend (`contato@mhdn.com.br`) configurado no dashboard Supabase; env vars `EXPO_PUBLIC_SUPABASE_*` no Vercel (prod + preview + dev). Sync segue anônimo por baixo. **Faltam:** **B** server valida JWT + rooms por userId (breaking change pros testers — precisa aviso via WhatsApp antes do rollout); **C** migração dos dados anônimos existentes pra sala do userId
- 🟡 Validar sync em cenários reais: offline → online, dois dispositivos, reinstalação. **Parcial:** 2 clients simultâneos no mesmo room via TLS público provados end-to-end (`server/smoke-two-clients.js`, #204). **Falta:** rodar cenários no app RN real (offline→online, reinstall) — depende da fatia B do item de auth acima
- ⬜ Ajustar regras/permissões do lado do transporte escolhido. Hoje: quem sabe o pathId conecta; após auth, JWT vira o gate. Reavaliar depois se aparecer necessidade além disso (ex: multi-user compartilhado, roles)

---

## M7 — Quality of Life

**Objetivo de saída:** o app é bom de usar, não só funcional.

- ⬜ Gráficos/tendências simples por métrica (ex: água por semana)
- ⬜ Lembretes e notificações (`expo-notifications`)
- ⬜ Metas personalizadas por métrica
- ⬜ **Autocuidado como 6ª métrica** (novo valor de `tipo` + config de tela; sem estrutura nova)
- ⬜ Micro-interações e feedback visual ao registrar

---

## M8 — Estabilização & Manutenção de Longo Prazo

**Objetivo de saída:** o app aguenta ser usado por anos, não só semanas.

- ⬜ Tratamento de erros e estados vazios
- ⬜ Exportação/backup de dados (JSON/CSV) — a rota de exportação já está prevista
- 🟡 Build via EAS, instalado fora do Expo Go — perfil `preview` gera **APK** instalável (`buildType: apk`, #71/#72); primeiro APK `preview` gerado e **validado num Android real**. Falta o build de **produção** (`.aab` + submit à loja).
- ⬜ Documentação de manutenção (como rodar, como publicar updates)

---

## Como usar este roadmap

Cada milestone deve ser concluído (ou conscientemente abreviado, com anotação do porquê) antes de avançar. Se um milestone crescer demais durante o desenvolvimento, é sinal de escopo vazando — volte ao documento de Escopo & MVP antes de continuar.

A ordem M1 → M2 é deliberada: **sanear a fundação (persistência + estilo) antes de unificar as telas.** Não adianta extrair um componente-base de tela que renderiza quebrado no Android ou que grava dados que somem no reload. Primeiro o chão firme, depois construir por cima.
