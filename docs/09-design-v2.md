# Design v2 — Back on Track

Este documento é a fonte única dos tokens visuais do redesign completo (M5-B) baseado no Turno 2 do Claude Design. **Estende** e progressivamente substitui a base do [08-design-tokens.md](./08-design-tokens.md) — os tokens M5 continuam válidos até que cada tela seja migrada.

## Tom

**Retomada, não conquista.** Sem streaks, sem badges, sem exclamação. O usuário vem, registra, sai. Copy calma: "3 registros hoje. Sem pressa." em vez de "🎉 Parabéns! Você bateu sua meta!".

## Paleta

### Marca (canônica, sem cor nova)

| Token         | Hex       | Uso                                           |
| ------------- | --------- | --------------------------------------------- |
| `brand-blue`  | `#2E5A88` | Ícone, ações primárias, identidade            |
| `brand-green` | `#4CAF50` | Ponto de partida do símbolo, sucesso discreto |
| `bg-canvas`   | `#F8F9FA` | Fundo geral (light), splash background        |
| `ink`         | `#0F1419` | Texto principal, alto contraste               |

### Grays semânticos (novos)

Vindos do design, mapeando aos usos concretos das mockups.

| Token            | Hex       | Uso                                                                             |
| ---------------- | --------- | ------------------------------------------------------------------------------- |
| `label`          | `#6B7280` | Section labels (MENU, MÉTRICAS DE HOJE), metadados (data, contadores discretos) |
| `body-secondary` | `#4B5563` | Texto secundário — descrições curtas embaixo de headings                        |
| `border-subtle`  | `#E5E7EB` | Borda de card, divisor fino                                                     |
| `border-strong`  | `#D1D5DB` | Borda mais forte quando precisa contraste                                       |
| `surface-subtle` | `#F3F4F6` | Fundo interno de área secundária (row hover, section bg)                        |
| `icon-dim`       | `#9CA3AF` | Ícone desativado ou de peso menor                                               |

### Tint

| Token       | Hex       | Uso                                                       |
| ----------- | --------- | --------------------------------------------------------- |
| `tint-blue` | `#EAF3FB` | Fundo do container de ícone da métrica água (azul lavado) |

Métricas usam o mesmo padrão de tint. Cada métrica ganha o seu no roadmap — não hardcode aqui além do exemplo água.

## Tipografia

Duas famílias, ambas via `expo-font` + `@expo-google-fonts/*` (OTA-safe, sem native change):

- **Inter** (400/500/600) — corpo e headings
- **JetBrains Mono** (400/500) — labels em uppercase (section headers, chips)

⚠️ **O boot BLOQUEIA até as fontes carregarem** (`app/_layout.jsx` retorna `null` enquanto `useFonts` não resolve, com o splash nativo segurado pelo `expo-splash-screen`). A fatia 0 tinha feito o contrário — carregava em background pra "não introduzir splash extra" — e isso custou caro: no Android a UI montava com a fonte de fallback, o sistema media o texto com ela, e quando a Inter chegava o glifo real não cabia mais na caixa já dimensionada. A última letra cortava ("Depois" virava "Depoi"). Foi diagnosticado errado três vezes (#239, #249, #268) antes de achar a corrida. Não voltar a descartar o retorno do `useFonts`.

### Escala (px direto — sem rem, sem `62.5%`)

| Papel         | Size / Weight / Family            | Nota                                       |
| ------------- | --------------------------------- | ------------------------------------------ |
| Section label | 11px · 500 · JetBrains Mono UPPER | tracking `0.1em`                           |
| Tag/chip      | 11px · 500 · JetBrains Mono UPPER | tracking `0.12em`                          |
| Small         | 12-13px · 400 · Inter             | metadados, descrições curtas               |
| Body          | 14-15px · 400 · Inter             | texto padrão                               |
| Body strong   | 14px · 500 · Inter                | destaques inline                           |
| Subhead       | 18-20px · 500 · Inter             | títulos de card                            |
| H1 tela       | 24px · 600 · Inter                | "Bom dia, Ana."                            |
| H1 documento  | 32px · 600 · Inter                | headers de página fora do app (docs, mock) |

Corpo em 14-15px é **menor** que o M5 baseline de 17px (iOS-aligned). Migração é gradual — telas velhas seguem no 17, telas novas nascem no 14. Convergem quando todas migrarem.

## Radius

| Token            | Value | Uso                                           |
| ---------------- | ----- | --------------------------------------------- |
| `radius-tag`     | 2px   | Chips/tags pequenas                           |
| `radius-icon`    | 12px  | Container de ícone de métrica (44×44)         |
| `radius-card`    | 16px  | Card padrão                                   |
| `radius-full`    | 999px | Pills, avatars, alguns botões                 |
| (frame do phone) | 42px  | Só nas mockups do design, não é radius do app |

M5 já tem `rounded-full` / `rounded-lg` / `rounded-md`. Reaproveita: `rounded-full` (=999px), `rounded-2xl` (=16px, mesmo do `radius-card`), etc. Ver 08.

## Componentes-chave (do design)

### Metric card (Home)

```
+--------------------------------------------+
| [icon-container 44×44 tint bg]  Água       |
|                                  350ml     |
+--------------------------------------------+
```

- Card: `bg-white`, `rounded-2xl` (16px), `border-subtle` (`#E5E7EB`), padding 16px
- Ícone container: 44×44px, `radius-icon` (12px), fundo tint por-métrica (`tint-blue` pra água)
- Nome: 14px/500 Inter, cor `ink`
- Estado: 12-13px/400 Inter, cor `label` ou valor (ml/refeição) em 14px

### Section label

Uppercase, JetBrains Mono 11px, cor `label`, tracking 0.1em. Reusar via `<SectionLabel>` que já existe (só troca a família da fonte).

### Icon container tinted

44×44, `rounded-xl` (12px), fundo tint por-métrica, ícone SVG 22×22 dentro na cor da marca ou cor semântica.

## O que vem quando

Fatia 0 (esta): docs, tokens em `tailwind.config.js`, fontes carregadas no boot. **Nada visual muda.**

Fatias 1-5: Home → registro → semana → ajustes → empty state. Cada tela consome os tokens acima.

Fatia 6: substituir os 4 assets do ícone (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`) pela **direção 1c (Linha que sobe)**. Mudança nativa → bump `version` → APK 1.2.0.

## Ver também

- [08-design-tokens.md](./08-design-tokens.md) — baseline M5 (ainda válido pras telas não migradas)
- [04-roadmap-milestones.md](./04-roadmap-milestones.md) — item M5-B na milestone Design System
- Arquivo `Back on Track - Icon Directions.html` no repo local (gitignored) — fonte visual do Claude Design
