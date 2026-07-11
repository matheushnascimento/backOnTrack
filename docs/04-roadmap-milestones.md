# Roadmap de Milestones - Back on Track

Este roadmap foi **reescrito para um projeto em adaptação**,. O "Back on Track" já existe, já roda no Android e já tem trabalho real investido. O papel do roadmap aqui é distinguir o que já está pronto, o que está inacabado, e o que o diagnóstico do código revelou como dívida a pagar.

Cada milestone tem um objetivo de saída claro. Sabe-se que terminou quando esse objetivo é verdade.

**Legenda:** ✅ pronto · 🟡 parcial/inacabado · ⬜ ainda não feito

**Nota sobre sincronização:** A ideia é: local + sync na nuvem desde o início. A arquitetura (ADR-004, TinyBase) já nasce pronta para isso, mas a milestone de _ativar e validar_ sync (M4) vem depois de o MVP local estar sólido. Isso evita empilhar duas curvas de aprendizado ao mesmo tempo (RN + sync), exatamente o tipo de gargalo que o projeto nasceu pra resolver.

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
- ⬜ Tela "hoje" consolidando o progresso do dia (uma query só, graças à tabela única)
- 🟡 Histórico navegável por data (as rotas de histórico já existem, precisam consumir a store nova) — `MyHistory` já lê a store via `get`/`getByMonth`, mas ainda falta a navegação por data e as rotas `(history)/*` são stubs
- ✅ Editar/excluir registros (#63): o `MyHistory` tem ações **Editar** (abre a tela via `?id=`) e **Excluir** (com confirmação) por registro
- ⬜ Primeiro dia de uso real substituindo o papel

---

## M4 — Sincronização em Nuvem

**Objetivo de saída:** os dados sobrevivem a perda/troca de aparelho.

- ⬜ Escolher e configurar o Synchronizer do TinyBase (WebSocket próprio, PowerSync, ou outro transporte)
- ⬜ Autenticação/identificação mínima do dispositivo, se o transporte exigir
- ⬜ Validar sync em cenários reais: offline → online, dois dispositivos, reinstalação
- ⬜ Ajustar regras/permissões do lado do transporte escolhido

---

## M5 — Quality of Life

**Objetivo de saída:** o app é bom de usar, não só funcional.

- ⬜ Gráficos/tendências simples por métrica (ex: água por semana)
- ⬜ Lembretes e notificações (`expo-notifications`)
- ⬜ Metas personalizadas por métrica
- ⬜ **Autocuidado como 6ª métrica** (novo valor de `tipo` + config de tela; sem estrutura nova)
- ⬜ Identidade visual do "Back on Track" (tema, ícones)
- ⬜ Micro-interações e feedback visual ao registrar

---

## M6 — Estabilização & Manutenção de Longo Prazo

**Objetivo de saída:** o app aguenta ser usado por anos, não só semanas.

- ⬜ Tratamento de erros e estados vazios
- ⬜ Testes nas funções de domínio (unitários); E2E opcional
- ⬜ Exportação/backup de dados (JSON/CSV) — a rota de exportação já está prevista
- 🟡 Build via EAS, instalado fora do Expo Go — perfil `preview` gera **APK** instalável (`buildType: apk`, #71/#72); primeiro APK `preview` gerado e **validado num Android real**. Falta o build de **produção** (`.aab` + submit à loja).
- ⬜ Documentação de manutenção (como rodar, como publicar updates)

---

## Como usar este roadmap

Cada milestone deve ser concluído (ou conscientemente abreviado, com anotação do porquê) antes de avançar. Se um milestone crescer demais durante o desenvolvimento, é sinal de escopo vazando — volte ao documento de Escopo & MVP antes de continuar.

A ordem M1 → M2 é deliberada: **sanear a fundação (persistência + estilo) antes de unificar as telas.** Não adianta extrair um componente-base de tela que renderiza quebrado no Android ou que grava dados que somem no reload. Primeiro o chão firme, depois construir por cima.
