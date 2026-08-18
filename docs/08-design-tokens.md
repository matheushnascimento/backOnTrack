# Design Tokens do Back on Track

> **Nota (M5-B, agosto 2026):** o redesign completo baseado no Turno 2 do Claude Design vive em [09-design-v2.md](09-design-v2.md). Este doc segue como baseline pra telas ainda não migradas, e os dois convergem quando todas as fatias 1-6 do v2 estiverem em produção.

Referência viva do design system do M5. Cada seção fecha uma decisão sobre um **eixo** (raio, tipografia, espaçamento, cor…) e mostra onde ela vale. O objetivo é matar as escolhas ad-hoc que a auditoria pegou em [docs/07-auditoria-ui.md](07-auditoria-ui.md), de forma que "qual valor uso aqui?" tenha uma resposta óbvia em cada eixo.

O doc cresce em fatias: começa com raio (fatia 1); tipografia, espaçamento, sombra e cor entram conforme a milestone avança. Cada fatia deve ter um PR próprio e um item ✅ no roadmap.

---

## Raio (`rounded-*`), fatia 1

**Regra:** três valores canônicos, um papel cada. Zero uso do `rounded` (default) ou de raio ad-hoc (`rounded-[Npx]`).

| Token          | Papel                                    | Onde usar                                                              |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| `rounded-full` | Pills: o "elemento é circular / cápsula" | Botões, chips de métrica, badge de nota                                |
| `rounded-lg`   | Cards: containers de conteúdo            | Card do topo das telas, `HistoryCard`, card do form da tela de métrica |
| `rounded-md`   | Controles: inputs e caixas pequenas      | `MyInput`, inputs de duração/quantidade, inputs pequenos do `registry` |

### Rationale

- **Escolher pelo papel, não pelo tamanho.** Um card grande e um card pequeno usam o mesmo raio; um input grande e um input pequeno também. Assim `qual raio?` fica em função de `o que é isso?`, e a mudança futura de token (`rounded-lg` → `rounded-xl`, se um dia) muda tudo consistente.
- **Três valores é o mínimo útil.** Menos que isso mata a diferença card × control (fica tudo uniforme, sem hierarquia visual); mais que isso volta ao problema de escolha ad-hoc.
- **Alinha com o Tailwind default**, sem tokens custom no `tailwind.config.js`, barato de manter, sem camada de indireção.

### O que a fatia mudou (#154)

- `MyInput.jsx`: `rounded` → `rounded-md` (mata o default órfão)
- `MyHistory.jsx` `HistoryCard`: `rounded-md` → `rounded-lg` (é card, não control)
- `fields.jsx` inputs de duração / MIN-MAX-IDEAL / QuantityField: `rounded-lg` → `rounded-md`
- `registry.jsx` `INPUT_LG`: `rounded-lg` → `rounded-md`

Cards que já estavam em `rounded-lg` (as 6 telas topo-nível, `InstallApp.web`, `MetricScreen`, `fields.jsx` CARD, `registry.jsx` linhas 126/216) ficaram como estavam, porque já seguiam o token do papel deles.

### Como validar

Grep no repo só encontra os 3 valores canônicos:

```bash
git grep -oE 'rounded(-[a-z0-9]+)?' -- '*.jsx' '*.js' | sort | uniq -c
```

Deve retornar apenas `rounded-full`, `rounded-lg` e `rounded-md`.

### O que NÃO está resolvido aqui

- **Card duplicado como string constante** em 6 telas (§1 da auditoria): vem no item "Componentizar" do M5, não aqui.
- **Tokens semânticos de cor**, incluindo o `bg-secondary` reciclado pra 3 papéis (§3.1), vem numa fatia própria de cor.
- **Escala tipográfica**, incluindo os `text-[26px]`/`text-[19px]` fora da escala e o truque `font-size: 62.5%` (§4): fatia própria.

---

## Tipografia (`text-*`), fatia 2

**Regra:** escala custom em `tailwind.config.js`, em px direto, ergonômica pra mobile. Zero uso de `text-[Npx]` (pixel cru fora da escala).

| Token       | px  | Papel                                              | Onde usar                                                                      |
| ----------- | --- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `text-xs`   | 13  | Rótulo de seção (SECTION LABEL)                    | "MÉTRICAS DE HOJE", "UTILITÁRIOS", "HISTÓRICO"… nos cards das telas topo-nível |
| `text-sm`   | 15  | Secondary                                          | Detalhe do item, texto de rodapé menor                                         |
| `text-base` | 17  | Corpo: iOS body                                    | Linhas de métrica, item de histórico, input de observação, descrições          |
| `text-lg`   | 19  | Rótulo de campo (FIELD LABEL) e valores destacados | "MIN"/"MAX"/"IDEAL", "OBS:", "Nota", "Hora do treino", badge da nota           |
| `text-xl`   | 22  | Subtitle                                           | reservado (sem uso ainda)                                                      |
| `text-2xl`  | 28  | Título de card                                     | "Hoje", "Enviar feedback", "Testers", inputs grandes de métrica                |

### Rationale

- **Body = 17px alinha com o padrão iOS** (`system body` = 17pt) e sente confortável em web também. Tailwind default de 16px estava ficando apertado, sobretudo em telas maiores.
- **Escala custom em px direto**: resolve a raiz do §4 da auditoria: o `font-size: 62.5%` mal aplicado tentava fazer `rem` virar "1 = 10px", mas comportamento não era previsível. Definindo em px, cortamos a dependência do `font-size` do html e do NativeWind gerar rem/px.
- **Um valor por papel.** Nome do papel importa mais que o número: `LABEL` estava sendo usado com dois significados diferentes (rótulo de seção `text-xs opacity-60` × rótulo de campo `text-lg`) e a fatia adota `FIELD_LABEL` nos arquivos de métrica pra desambiguar. O `LABEL` das telas topo-nível fica como está até a fatia de componentização, quando vira `SectionLabel` como componente.
- **Escala Tailwind, valores custom.** Manter os nomes canônicos (`text-xs`, `text-base`, `text-lg`, `text-2xl`) permite trocar valores num único arquivo (`tailwind.config.js`) sem caçar pixel cru pelo repo depois, com a decisão em um lugar só.

### O que a fatia mudou (#157)

- `tailwind.config.js`: nova escala `fontSize` custom (xs 13, sm 15, base 17, lg 19, xl 22, 2xl 28) sobrescrevendo a default do Tailwind.
- `global.css`: remove `font-size: 62.5%` aplicado em `*` (compunha por nível de aninhamento, §4 da auditoria).
- `components/metrics/fields.jsx` (3×) e `components/metrics/registry.jsx` (1×): `text-[26px]` → `text-2xl` (agora 28px).
- `components/metrics/MetricScreen.jsx`: `text-[19px]` → `text-base` (17px) no `TextInput` de observação. Bate com o corpo, sem mais mismatch input/corpo.
- `components/metrics/MetricScreen.jsx`, `components/metrics/fields.jsx`, `components/metrics/registry.jsx`: `LABEL` → `FIELD_LABEL`. Escopo local (constantes por arquivo), não afeta consumidores.

### Como validar

Zero pixel cru de fonte no repo:

```bash
git grep -nE 'text-\[[0-9]+px\]' -- '*.jsx' '*.js' '*.css'
```

Deve retornar vazio.

Ajustar a escala depois: só editar `theme.extend.fontSize` no `tailwind.config.js`, e todo o repo herda o novo valor.

### O que NÃO está resolvido aqui

- **Constante `LABEL` das telas topo-nível** (6 arquivos, mesma string byte a byte): vai virar `SectionLabel` na fatia de componentização, junto com `CardLabel`/`Card` (§1 da auditoria).
- **Peso e altura de linha** (`font-bold`, `leading-*`): hoje `font-bold` é aplicado direto onde aparece; se um dia virar decisão de token, fica pra fatia própria.

---

## Espaçamento (`gap-*` / `p-*`), fatia 3

**Regra:** escala default do Tailwind (grid de 4px), zero fracionários. Um valor por papel.

| Token | px  | Papel                                                                |
| ----- | --- | -------------------------------------------------------------------- |
| `-1`  | 4   | tight: só quando `-2` sente exagerado (raro)                         |
| `-2`  | 8   | dense: itens adjacentes numa linha (checkbox + label, ícone + texto) |
| `-3`  | 12  | medium: cards compactos, gap entre itens numa lista                  |
| `-4`  | 16  | comfortable: padding padrão de card, gap entre linhas de seção       |
| `-6`  | 24  | spacious: reservado; sem uso hoje, disponível se aparecer o degrau   |
| `-8`  | 32  | big: separação vertical entre seções grandes de form                 |

Serve pra `gap-*` (entre filhos) e `p-*` (dentro do container). `gap-*` e `p-*` **usam a mesma escala**: se dois cards vizinhos estão com padding `p-3` e o espaço entre eles é `gap-3`, o ritmo visual fecha.

### Rationale

- **Grid de 4px é padrão de mercado** (iOS 8pt/4pt subgrid, Material 4dp/8dp). Todo múltiplo de 4 fica alinhado a qualquer coisa que a plataforma render em cima; múltiplos de 2 (`gap-1.5`, `gap-2.5`) quebram esse alinhamento sem ganhar nada.
- **Escala do Tailwind default já é o grid**: `-1`/`-2`/`-3`/`-4`/`-6`/`-8` mapeiam pra 4/8/12/16/24/32px. Não vale customizar em `tailwind.config.js` como fizemos com tipografia; aqui a default já é a decisão.
- **Um valor por papel.** A auditoria pegou `p-4`/`p-2.5`/`gap-8`/`gap-2.5` misturados sem critério, e a diferença entre `p-3` (12px) e `p-2.5` (10px) é um pixel arbitrário, sem decisão de design por trás.

### O que a fatia mudou (#160)

Substituições em ~10 arquivos (`app/*.jsx`, `components/*.jsx`, `components/metrics/*.jsx`):

- `gap-1.5` → `gap-2` (6×)
- `gap-2.5` → `gap-3` (5×)
- `gap-5` → `gap-4` (1×, CounterField, único off-grid)
- `p-1.5` → `p-2` (5×)
- `p-2.5` → `p-3` (6×)

Efeito visual: +2px na maioria dos casos (imperceptível), -4px no CounterField.

Nada muda no `tailwind.config.js`: a decisão é usar a escala default como-é. O `px-*`/`py-*` assimétrico de botões e inputs (`px-2 py-1`, `px-4 py-2`) fica como está, porque a assimetria horizontal/vertical é intencional pra esse tipo de controle.

### Como validar

Zero valor off-grid no repo:

```bash
git grep -nE '\b(gap|p|px|py|pt|pb|pl|pr)-(1\.5|2\.5|5|7|9|10)\b' -- '*.jsx' '*.js'
```

Deve retornar vazio.

### O que NÃO está resolvido aqui

- **`px-*`/`py-*` de botões/inputs**: hoje `MyButton` usa `px-4 py-2`, `MyInput` usa `px-2 py-1`. São decisões de forma do controle, não de layout, então ficam pra fatia de componentização, quando componentes ganharem forma canônica.
- **Marginação por classe** (`mx-`, `my-`, `mt-`, `mb-`): o repo mal usa margin (o layout é quase todo `gap-*` em flex). Se aparecer, cai na mesma escala.

---

## Sombra (`shadow`), fatia 4

**Regra:** um único nível de elevação, aplicado por `style`. Não há hierarquia de sombra hoje.

| Token                                         | Definição                                                                                               | Papel                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `shadow` (objeto RN em `constants/Colors.js`) | `elevation: 4`, `shadowColor: "#000"`, `shadowOffset: {0, 4}`, `shadowOpacity: 0.25`, `shadowRadius: 4` | Elevação padrão: top-level cards e controles |

Uso: `style={shadow}` ou `style={[shadow, otherStyle]}`.

### Regras de aplicação

1. **Top-level card** (direto no `ScrollView`, topo do conteúdo da tela) → aplica `shadow`.
2. **Nested card** (dentro de outro card, tipo `DurationField` dentro do form) → **sem** shadow. Evita dupla elevação.
3. **Controle** (`MyButton`, `MyIconButton`) → shadow embutido no componente, e quem usa não precisa lembrar.

### Rationale

- **Um nível é o mínimo útil hoje.** O app não tem modal, dropdown, popover ou drawer flutuante: o único plano acima do fundo é "card + botão". Adicionar níveis (ex: `shadow-sm`, `shadow-lg`) só ganha valor quando houver hierarquia visual pedindo.
- **Objeto RN, não Tailwind class.** `shadow-*` do Tailwind gera `box-shadow` CSS: no web funciona, no native o NativeWind traduz mas com semântica diferente (elevation Android vs shadowX iOS). Manter em objeto RN é explícito e portável entre plataformas.
- **`style={shadow}` como pattern.** Consistente com `Snackbar`/inputs que já usam `style` inline pra props RN puras.

### O que a fatia mudou (#163)

- `components/metrics/MetricScreen.jsx`: adiciona `import { shadow }` e aplica `style={shadow}` no card top-level do form. Alinha com as 6 telas topo-nível que já tinham (index, history, admin, feedback, roadmap, InstallApp.web). Miss de quando `MetricScreen` foi montado (M2, #80).

### Como validar

Todos os cards top-level do repo têm `style={shadow}`:

```bash
git grep -B1 -A2 '${CARD}\|max-w-\[640px\].*rounded-lg' -- '*.jsx'
```

Deve mostrar `style={shadow}` acompanhando cada card top-level (com exceção dos cards nested como `DurationField`, regra 2).

### O que NÃO está resolvido aqui

- **Migrar pra `tailwind.config.js` `boxShadow`**: requer validar NativeWind renderizando igual em native (elevation/shadowX). Fora de escopo; hoje o objeto RN é a fonte da verdade.
- **Segundo nível de elevação** (`shadow-lg` pra modal, `shadow-sm` pra chip), só faz sentido quando o app ganhar esses componentes; fatia própria.

---

## Cor (`bg-*` / `text-*`), fatia 5

**Regra:** paleta base em `constants/Colors.js`, exposta em `tailwind.config.js`. Um token por papel semântico. Zero uso da paleta Tailwind default pra sinal (`text-red-*`, `bg-green-*`, etc).

### Paleta base

| Token       | Valor     | Papel                                                           |
| ----------- | --------- | --------------------------------------------------------------- |
| `primary`   | `#2E5A88` | Botão padrão, elementos-chave da marca                          |
| `secondary` | `#4CAF50` | Selecionado/ativo/positivo (verde da marca, Material green-500) |
| `danger`    | `#F44336` | Ação destrutiva ou erro visível (Material red-500)              |

### Tokens de superfície (por tema)

Continuam em `Colors.light` / `Colors.dark`, expostos como `light-*` / `dark-*` no Tailwind. Usados sempre com `dark:` pra alternar (`bg-light-background dark:bg-dark-background`).

| Token            | Light                 | Dark                        |
| ---------------- | --------------------- | --------------------------- |
| `background`     | `#F8F9FA`             | `#333333`                   |
| `text`           | `#333333`             | `#F8F9FA`                   |
| `outerText`      | `#F8F9FA`             | `#333333`                   |
| `backgroundCard` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.15)` |

### Regras semânticas

- `bg-primary`: botão padrão (marca).
- `bg-secondary`: selecionado, ativo, nota máxima, progresso positivo. É o verde da marca; mesmo papel visual serve os 4 usos.
- `bg-danger` / `text-danger`: só onde é **destrutivo** (excluir/remover) ou **erro** visível ao usuário.

Nunca reciclar um token pra um papel diferente do declarado. Se um novo papel semântico aparecer (`warning`, `info`), ele ganha token próprio, sem pegar carona no `secondary`.

### Rationale

- **Nome do papel importa mais que a cor.** A auditoria pegou `bg-secondary` sendo usado com 3 significados diferentes: chip selecionado, badge de nota máxima, e botão "Remover" tester (§3.1). Os dois primeiros compartilham "positivo/verde-da-marca"; o "Remover" é destrutivo e precisa de cor própria.
- **Material green-500 + Material red-500**: o `secondary` já era Material green-500 (`#4CAF50`), então o `danger` como Material red-500 (`#F44336`) casa em saturação e peso visual, sem precisar reafinar o `secondary`.
- **Não temos `success`, `warning`, `info`, de propósito.** O app não tem sinal semântico que exija cores próprias hoje. Se surgir, entra em fatia própria com token semântico próprio, sem sobrescrever nenhum existente.

### O que a fatia mudou (#166)

- `constants/Colors.js`: adiciona `Colors.danger = "#F44336"` no topo (paralelo a `primary` e `secondary`).
- `tailwind.config.js`: expõe `danger: Colors.danger` no `colors.extend`.
- `app/admin.jsx`: botão "Remover" tester: `bg-secondary` → `bg-danger`. O fix real: hoje o "Remover" tá verde, mesma cor do "está selecionado".
- `app/feedback.jsx`: mensagem de erro do submit: `text-red-500` → `text-danger`. Traz o único uso da paleta Tailwind default pra dentro do sistema.

### Como validar

Todo `bg-secondary` restante é semantica "selecionado/positivo" (chip do `MyButton`, badge score-5 do `MyHistory`, barra de progresso da Home/Roadmap, banner de update). Zero uso da paleta Tailwind default pra sinal:

```bash
git grep -nE 'text-red-|bg-red-|text-green-|bg-green-|text-yellow-|bg-yellow-' -- '*.jsx'
```

Deve retornar vazio.

### O que NÃO está resolvido aqui

- **Cor de borda** (`border-[#333]` / `dark:border-[#888]` inline em `MyInput` e `MyIconButton`): funciona nos dois temas depois do fix funcional (#153). Virar token exigiria redesenho de `MyInput`/`MyIconButton` (props ou variantes); fatia própria se aparecer segunda cor de borda semântica.
- **Cor de placeholder** (`placeholderTextColor="#888"` em `MyInput`): hex cru mas funcional em ambos os temas. Vira token quando componentizarmos `MyInput`.
- **Ícone hex fixo** (`color="#333"` em `MyButton`): cosmético, sem trigger claro.
- **Cor de ripple** (`android_ripple={{ color: "#00000022" }}`): detalhe de plataforma Android, e não vira token.

---

## Componentes derivados dos tokens

Não são tokens em si; são **componentes-base** que juntam vários tokens num único uso comum. Ficam em `components/*.jsx` e servem pra três coisas: (a) matar a duplicação byte a byte que a auditoria (§1, §4) pegou; (b) transformar a decisão "qual token nesse papel?" em "importa o componente certo"; (c) barrar drift: mexer no token muda todo o app, e não só o arquivo aberto.

### `Card`: [components/Card.jsx](../components/Card.jsx)

Container top-level das telas topo-nível. Composição:

- Raio: `rounded-lg` (papel "card")
- Superfície: `bg-light-backgroundCard dark:bg-dark-backgroundCard`
- Padding: `p-4` (comfortable)
- Largura: `w-full max-w-[640px]` (único breakpoint do app)
- Sombra: `style={shadow}` embutida (regra top-level card → shadow)
- Wrapper: `<MyView safe={false}>`

Aceita `className` (pra `gap-N` interno) e `style` (mesclado com `shadow`). Também é o card outer do form de métrica (`MetricScreen`), que passa `cardClass` custom (ex.: `overflow-hidden` pra alimentação) via `className`.

**Cards nested** (dentro de outro `Card`, e o form de métrica é o único caso hoje): usam a mesma superfície + raio, mas sem shadow (regra 2 da fatia sombra: evita dupla elevação) e **sempre com `w-full`**, assim o filho estica pra largura do outer e o ritmo visual fecha entre as 5 telas de métrica. Não são componentizados porque ainda são poucos e a composição interna varia (input + label × card com múltiplos inputs); se aparecerem 3+ variantes iguais, vira `<CardNested>`.

### `SectionLabel`: [components/SectionLabel.jsx](../components/SectionLabel.jsx)

Rótulo de seção dentro de card. Composição:

- Tipografia: `text-xs` (13px)
- Peso: `font-bold`
- Cor: `text-light-text dark:text-dark-text` com `opacity-60`

Uso: "MÉTRICAS DE HOJE", "UTILITÁRIOS", "HISTÓRICO", "CATEGORIA (OPCIONAL)"…

### `MyHeader`: [components/MyHeader.jsx](../components/MyHeader.jsx)

Faixa horizontal de **chips das 5 métricas** (água, sono, alimentação, exercício, estudo). Clicar num chip navega pra tela de registro daquela métrica; clicar num chip já selecionado volta pra Home.

**Papel semântico:** atalho pra registrar métrica. Só faz sentido em contextos onde o usuário está prestes a registrar uma métrica ou já registrou uma.

**Onde usar:**

- `app/index.jsx` (Home: hub de acesso rápido)
- `app/history.jsx` (do histórico se pula direto pra registrar)
- `components/metrics/MetricScreen.jsx` (switch entre métricas)

**Onde NÃO usar** (chips seriam ruído sem contexto):

- `app/admin.jsx`, `app/feedback.jsx`, `app/roadmap.jsx`: essas telas ativam o header nativo do Expo Router (`headerShown: true` na `Stack.Screen` do `app/_layout.jsx`) que fornece título + back arrow.

**Altura travada em três camadas:** o `ScrollView` horizontal usa `h-16 shrink-0` (64px, não cede) e o chip usa `h-10` (40px), e os dois casam com o `p-3` (24px) vertical do ScrollView (`64 - 24 = 40`). Sem essas fixações, três bugs visuais aconteciam:

- Sem `h-16` no ScrollView, a faixa herdava a altura intrínseca dos filhos e reflowava a cada re-render/`router.navigate`, esticando visualmente durante a transição de rota.
- Sem `h-10` no chip, o RN Web re-media o `Pressable` ao trocar `bg-primary ↔ bg-secondary` e o chip piscava de tamanho a cada seleção, mesmo sem qualquer mudança de padding/tipografia.
- Sem `shrink-0` no ScrollView, telas com muito conteúdo (Home) espremiam o header via `flex-shrink: 1` default do flex column pai, e o padding do primeiro card visualmente invadia a área dos chips. Formulários curtos (MetricScreen) não expunham o bug.

Se um dia mudar o padding do ScrollView ou a tipografia do chip, revisitar os três juntos.

### `FieldLabel`: [components/FieldLabel.jsx](../components/FieldLabel.jsx)

Rótulo de campo de formulário. Composição:

- Tipografia: `text-lg` (19px)
- Peso: `font-bold`
- Cor: `text-light-text dark:text-dark-text` (sem opacity)

Uso: "MIN"/"MAX"/"IDEAL", "OBS:", "Nota", "Hora do treino", `h`/`min` de duração, unidade em `QuantityField`.

### O que a fatia mudou (#169)

- Cria `components/Card.jsx`, `components/SectionLabel.jsx`, `components/FieldLabel.jsx`.
- Migra 6 telas topo-nível (`app/{index,history,admin,feedback,roadmap}.jsx` e `components/InstallApp.web.jsx`) pra usar `Card` + `SectionLabel`. Remove os constantes locais `CARD` e `LABEL` (que estavam byte a byte iguais em cada arquivo).
- Migra `components/metrics/{MetricScreen,fields,registry}.jsx` pra usar `FieldLabel`. Remove os constantes locais `FIELD_LABEL`.

### O que NÃO está resolvido aqui

- **Card do form de métrica** (`MetricScreen.jsx:100`) + cards nested em `fields.jsx` e `registry.jsx`, com largura, padding e estrutura diferentes; casam com o follow-up "padronizar largura dos forms de métrica" e viram fatia própria.
- **`HistoryCard`**: já é componente próprio com estrutura interna própria (badge de nota, botões editar/excluir, exercício); segue como está.
- **Revisar `MyHeader`** (papel de navegação vs. chips): item próprio do M5.

## Estados canônicos

Contratos de estado embutidos nos componentes-base: o consumidor passa a **intenção** (`disabled`, `isSelected`, etc.), não a implementação visual.

### `disabled`: [`MyButton`](../components/MyButton.jsx) / `MyIconButton`

- **Prop:** `disabled` (boolean, default `false`).
- **Visual:** aplica `opacity-40` internamente.
- **Comportamento:** `Pressable` recebe `disabled` explícito e bloqueia `onPress` nativamente.

Uso:

```jsx
<MyButton title="Enviar" onPress={send} disabled={!canSend} />
```

Rationale: `opacity-40` (0.4) alinha com convenção iOS e resolve §7 da auditoria, porque antes cada tela reinventava (`0.4` vs `opacity-50`), com o visual e o bloqueio de `onPress` desconectados. Agora é um contrato só.

---

## Identidade visual

O sistema até aqui é técnico (tokens de raio, tipografia, cor por papel). Esta seção fecha a parte **de marca**: nome, tagline, metáfora, tom de voz, e como esses tokens já são também escolhas de identidade.

### Nome e slug

- **Nome (display):** "Back on Track": o que aparece no launcher/browser tab, no wordmark da UI, na documentação e na comunicação com testers.
- **Slug técnico:** `backOnTrack`, identificador interno do Expo/EAS (`app.json`, `bundleIdentifier`, `package`, `projectId`). **Não mexer**: mudar quebra deploy/OTA/store.

### Tagline

> **De volta aos trilhos, um registro por vez.**

A promessa é a **retomada**: o app é pra quem já saiu da rotina e quer voltar, não pra quem quer otimizar. Usado no wordmark do rodapé da Home e no Roadmap. Quando aparecer em novo contexto, essa é a versão canônica.

### Metáfora

**Trilhos, estrada, sinalização de trânsito.** O nome sugere caminho de volta; `assets/trecho-em-obras.png` (placa laranja de "trecho em obras") já sinaliza a direção. Qualquer ilustração/ícone/motivo gráfico futuro deve conversar com esse universo, sem forçar (não precisa de trilhos literais em tudo).

### Tom de voz

- **Gentileza da retomada**, não exigência. "Registrado", "hoje", "métricas do dia". Nunca "meta cumprida", "falhou", "streak quebrado".
- Verbos no infinitivo pra ação do usuário ("Alternar tema", "Limpar todos os dados", "Enviar feedback"), sem imperativo pesado ("ALTERE TUDO").
- Erro é conversado, não julgado: "Não consegui enviar (…). Tenta de novo em instantes." (feedback.jsx).

### Paleta como marca

Os tokens de cor já são decisões semânticas ([seção Cor](#cor-bg--text----fatia-5)); ganham aqui também um significado de identidade:

| Token       | Hex       | Marca                                                           |
| ----------- | --------- | --------------------------------------------------------------- |
| `primary`   | `#2E5A88` | Navy da **confiança/estabilidade**, o "chão firme" da retomada  |
| `secondary` | `#4CAF50` | Verde da **retomada positiva**: selecionado, ativo, nota máxima |
| `danger`    | `#F44336` | Vermelho da **exceção**: só destrutivo/erro, reservado          |

Superfícies (`light-background`, `dark-background`) são neutras por design, e o protagonismo visual fica pros dados, não pra decoração.

### Onde a marca aparece na UI

- Launcher / browser tab: nome "Back on Track" (`app.json`)
- Splash: fundo `#F8F9FA` (mesmo do app light) + splash-icon (Parte B, placeholder do Expo hoje)
- **Home:** wordmark discreto no rodapé da tela ("Back on Track · de volta aos trilhos, um registro por vez"), abaixo do card Utilitários
- **Roadmap:** título + tagline no primeiro card ("Back on Track" + "De volta aos trilhos, um registro por vez.")

### Parte B: entregue (#228)

Assets visuais substituídos por design real. Direção **1c · Linha que sobe** do projeto no Claude Design (`Back on Track - Icon Directions`, ID `4565395c-...`), escolhida entre 3 propostas por melhor traduzir o tom "retomada, não conquista": curva suave subindo + ponto verde ancorando o início (o "aqui, hoje"). Sem seta, sem streak, sem literalismo de trilho.

- `assets/icon.png`: 1024×1024, fundo navy (`#2E5A88`) + curva branca (`#F8F9FA`) + ponto verde (`#4CAF50`). Launcher iOS/Android legacy.
- `assets/adaptive-icon.png`: 1024×1024, símbolo navy sobre transparência. Android compõe com `adaptiveIcon.backgroundColor` (`#F8F9FA`).
- `assets/splash-icon.png`: 1024×1024, símbolo navy sobre transparência. Centralizado sobre `splash.backgroundColor` (`#F8F9FA`).
- `assets/favicon.png`: 96×96, fundo navy + curva branca (contraste alto no browser tab pequeno).

**SVGs source** vivem em `assets/source/`, com re-export via `./scripts/build-icons.sh` (ImageMagick). Mexer nos SVGs, rodar o script, commitar o par SVG+PNG junto.

**Racional da escolha (1c vs 1a/1b):** 1a era seta+trilho (mais literal, beira o esperado); 1b era trilho em perspectiva (risco de virar "V" em 24px); 1c é linha subindo (mais gentil, mais original, sem clichê de "conquista"). Bônus: só o ponto verde carrega a segunda cor, e o resto da forma é monocromática, o que sobrevive melhor em launcher pequeno e favicon.
