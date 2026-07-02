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
- 🟡 ESLint/Prettier — verificar se estão configurados (não confirmado no diagnóstico)

Essencialmente pronto. O que faltar aqui é pontual e não bloqueia o resto.

---

## M1: Sanear a Fundação (o trabalho real de agora)

**Objetivo de saída:** o app persiste dados de verdade e renderiza correto no Android. É aqui que mora a correção das duas causas de "mais visual do que funcional".

Esta milestone não existia no plano original — ela nasceu do diagnóstico do código. É a mais importante do roadmap: ataca exatamente as raízes que derrubaram as versões anteriores.

- ⬜ **Persistência:** integrar o persister TinyBase + Expo SQLite (`store.js` + `persistencia.js` revisados). Sem isso os dados somem a cada reload — a causa do "salvo enquanto não recarregar".
- ⬜ **TypeScript incremental:** ligar `allowJs` + `checkJs` (ADR-002). Sem migrar nada à força; arquivos novos nascem tipados.
- ⬜ **Fundação de estilo:** consolidar cores em `constants/Colors.js`, `tailwind.config.js` importando dela, `shadow` corrigida para objeto RN nativo (ADR-006).
- ⬜ **Migrar estilo para NativeWind**, componente a componente, começando pelos compartilhados (`MyButton` primeiro — conserta todos os botões de uma vez), validando no Android antes/depois (ver guia de migração de estilo).

---

## M2 — Modelo de Dados Unificado

**Objetivo de saída:** as telas gravam no modelo `Registro` unificado, com CRUD completo.

- ⬜ Implementar o `Registro` (ver Escopo & MVP) via a store revisada
- ⬜ Mapear/migrar os campos ad-hoc atuais (`score`, `min`/`max`/`ideal`, `observation`, `training`/`cardio`) para o formato unificado (`quantidade`/`unidade`/`nota`/`detalhes`)
- ⬜ Ligar as telas ao `add`/`update`/`remove`/`getAll` novos (hoje só existe criação)
- ⬜ **Extrair a tela de registro única:** as 5 telas viram configuração de um componente-base. É o passo que mata a duplicação de ~90 linhas por tela e fecha o risco de reboot por "arquitetura que não escala".

---

## M3 — MVP Funcional (uso diário real)

**Objetivo de saída:** o papel pode ser aposentado.

- ⬜ As 5 telas de registro rápido, sobre o componente-base unificado
- ⬜ Tela "hoje" consolidando o progresso do dia (uma query só, graças à tabela única)
- ⬜ Histórico navegável por data (as rotas de histórico já existem, precisam consumir a store nova)
- ⬜ Editar/excluir registros
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
- ⬜ Build de produção via EAS, instalado fora do Expo Go
- ⬜ Documentação de manutenção (como rodar, como publicar updates)

---

## Como usar este roadmap

Cada milestone deve ser concluído (ou conscientemente abreviado, com anotação do porquê) antes de avançar. Se um milestone crescer demais durante o desenvolvimento, é sinal de escopo vazando — volte ao documento de Escopo & MVP antes de continuar.

A ordem M1 → M2 é deliberada: **sanear a fundação (persistência + estilo) antes de unificar as telas.** Não adianta extrair um componente-base de tela que renderiza quebrado no Android ou que grava dados que somem no reload. Primeiro o chão firme, depois construir por cima.
