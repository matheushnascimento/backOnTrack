# Design Tokens — Back on Track

Referência viva do design system do M5. Cada seção fecha uma decisão sobre um **eixo** (raio, tipografia, espaçamento, cor…) e mostra onde ela vale. O objetivo é matar as escolhas ad-hoc que a auditoria pegou em [docs/07-auditoria-ui.md](07-auditoria-ui.md) — de forma que "qual valor uso aqui?" tenha uma resposta óbvia em cada eixo.

O doc cresce em fatias: começa com raio (fatia 1); tipografia, espaçamento, sombra e cor entram conforme a milestone avança. Cada fatia deve ter um PR próprio e um item ✅ no roadmap.

---

## Raio (`rounded-*`) — fatia 1

**Regra:** três valores canônicos, um papel cada. Zero uso do `rounded` (default) ou de raio ad-hoc (`rounded-[Npx]`).

| Token          | Papel                                     | Onde usar                                                              |
| -------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `rounded-full` | Pills — o "elemento é circular / cápsula" | Botões, chips de métrica, badge de nota                                |
| `rounded-lg`   | Cards — containers de conteúdo            | Card do topo das telas, `HistoryCard`, card do form da tela de métrica |
| `rounded-md`   | Controles — inputs e caixas pequenas      | `MyInput`, inputs de duração/quantidade, inputs pequenos do `registry` |

### Rationale

- **Escolher pelo papel, não pelo tamanho.** Um card grande e um card pequeno usam o mesmo raio; um input grande e um input pequeno também. Assim `qual raio?` fica em função de `o que é isso?`, e a mudança futura de token (`rounded-lg` → `rounded-xl`, se um dia) muda tudo consistente.
- **Três valores é o mínimo útil.** Menos que isso mata a diferença card × control (fica tudo uniforme, sem hierarquia visual); mais que isso volta ao problema de escolha ad-hoc.
- **Alinha com o Tailwind default**, sem tokens custom no `tailwind.config.js` — barato de manter, sem camada de indireção.

### O que a fatia mudou (#154)

- `MyInput.jsx` — `rounded` → `rounded-md` (mata o default órfão)
- `MyHistory.jsx` `HistoryCard` — `rounded-md` → `rounded-lg` (é card, não control)
- `fields.jsx` inputs de duração / MIN-MAX-IDEAL / QuantityField — `rounded-lg` → `rounded-md`
- `registry.jsx` `INPUT_LG` — `rounded-lg` → `rounded-md`

Cards que já estavam em `rounded-lg` (as 6 telas topo-nível, `InstallApp.web`, `MetricScreen`, `fields.jsx` CARD, `registry.jsx` linhas 126/216) ficaram como estavam — eles já seguiam o token do papel deles.

### Como validar

Grep no repo só encontra os 3 valores canônicos:

```bash
git grep -oE 'rounded(-[a-z0-9]+)?' -- '*.jsx' '*.js' | sort | uniq -c
```

Deve retornar apenas `rounded-full`, `rounded-lg` e `rounded-md`.

### O que NÃO está resolvido aqui

- **Card duplicado como string constante** em 6 telas (§1 da auditoria) — vem no item "Componentizar" do M5, não aqui.
- **Tokens semânticos de cor**, incluindo o `bg-secondary` reciclado pra 3 papéis (§3.1) — vem numa fatia própria de cor.
- **Escala tipográfica**, incluindo os `text-[26px]`/`text-[19px]` fora da escala e o truque `font-size: 62.5%` (§4) — fatia própria.

---

## Tipografia (`text-*`) — fatia 2

**Regra:** escala custom em `tailwind.config.js`, em px direto, ergonômica pra mobile. Zero uso de `text-[Npx]` (pixel cru fora da escala).

| Token       | px  | Papel                                              | Onde usar                                                                      |
| ----------- | --- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `text-xs`   | 13  | Rótulo de seção (SECTION LABEL)                    | "MÉTRICAS DE HOJE", "UTILITÁRIOS", "HISTÓRICO"… nos cards das telas topo-nível |
| `text-sm`   | 15  | Secondary                                          | Detalhe do item, texto de rodapé menor                                         |
| `text-base` | 17  | Corpo — iOS body                                   | Linhas de métrica, item de histórico, input de observação, descrições          |
| `text-lg`   | 19  | Rótulo de campo (FIELD LABEL) e valores destacados | "MIN"/"MAX"/"IDEAL", "OBS:", "Nota", "Hora do treino", badge da nota           |
| `text-xl`   | 22  | Subtitle                                           | reservado (sem uso ainda)                                                      |
| `text-2xl`  | 28  | Título de card                                     | "Hoje", "Enviar feedback", "Testers", inputs grandes de métrica                |

### Rationale

- **Body = 17px alinha com o padrão iOS** (`system body` = 17pt) e sente confortável em web também. Tailwind default de 16px estava ficando apertado, sobretudo em telas maiores.
- **Escala custom em px direto** — resolve a raiz do §4 da auditoria: o `font-size: 62.5%` mal aplicado tentava fazer `rem` virar "1 = 10px", mas comportamento não era previsível. Definindo em px, cortamos a dependência do `font-size` do html e do NativeWind gerar rem/px.
- **Um valor por papel.** Nome do papel importa mais que o número — `LABEL` estava sendo usado com dois significados diferentes (rótulo de seção `text-xs opacity-60` × rótulo de campo `text-lg`) e a fatia adota `FIELD_LABEL` nos arquivos de métrica pra desambiguar. O `LABEL` das telas topo-nível fica como está até a fatia de componentização, quando vira `SectionLabel` como componente.
- **Escala Tailwind, valores custom.** Manter os nomes canônicos (`text-xs`, `text-base`, `text-lg`, `text-2xl`) permite trocar valores num único arquivo (`tailwind.config.js`) sem caçar pixel cru pelo repo depois — decisão fica em um lugar só.

### O que a fatia mudou (#157)

- `tailwind.config.js` — nova escala `fontSize` custom (xs 13, sm 15, base 17, lg 19, xl 22, 2xl 28) sobrescrevendo a default do Tailwind.
- `global.css` — remove `font-size: 62.5%` aplicado em `*` (compunha por nível de aninhamento — §4 da auditoria).
- `components/metrics/fields.jsx` (3×) e `components/metrics/registry.jsx` (1×) — `text-[26px]` → `text-2xl` (agora 28px).
- `components/metrics/MetricScreen.jsx` — `text-[19px]` → `text-base` (17px) no `TextInput` de observação. Bate com o corpo, sem mais mismatch input/corpo.
- `components/metrics/MetricScreen.jsx`, `components/metrics/fields.jsx`, `components/metrics/registry.jsx` — `LABEL` → `FIELD_LABEL`. Escopo local (constantes por arquivo), não afeta consumidores.

### Como validar

Zero pixel cru de fonte no repo:

```bash
git grep -nE 'text-\[[0-9]+px\]' -- '*.jsx' '*.js' '*.css'
```

Deve retornar vazio.

Ajustar a escala depois: só editar `theme.extend.fontSize` no `tailwind.config.js` — todo o repo herda o novo valor.

### O que NÃO está resolvido aqui

- **Constante `LABEL` das telas topo-nível** (6 arquivos, mesma string byte a byte) — vai virar `SectionLabel` na fatia de componentização, junto com `CardLabel`/`Card` (§1 da auditoria).
- **Peso e altura de linha** (`font-bold`, `leading-*`) — hoje `font-bold` é aplicado direto onde aparece; se um dia virar decisão de token, fica pra fatia própria.

---

## Espaçamento (`gap-*` / `p-*`) — fatia 3

**Regra:** escala default do Tailwind (grid de 4px), zero fracionários. Um valor por papel.

| Token | px  | Papel                                                                 |
| ----- | --- | --------------------------------------------------------------------- |
| `-1`  | 4   | tight — só quando `-2` sente exagerado (raro)                         |
| `-2`  | 8   | dense — itens adjacentes numa linha (checkbox + label, ícone + texto) |
| `-3`  | 12  | medium — cards compactos, gap entre itens numa lista                  |
| `-4`  | 16  | comfortable — padding padrão de card, gap entre linhas de seção       |
| `-6`  | 24  | spacious — reservado; sem uso hoje, disponível se aparecer o degrau   |
| `-8`  | 32  | big — separação vertical entre seções grandes de form                 |

Serve pra `gap-*` (entre filhos) e `p-*` (dentro do container). `gap-*` e `p-*` **usam a mesma escala** — se dois cards vizinhos estão com padding `p-3` e o espaço entre eles é `gap-3`, o ritmo visual fecha.

### Rationale

- **Grid de 4px é padrão de mercado** (iOS 8pt/4pt subgrid, Material 4dp/8dp). Todo múltiplo de 4 fica alinhado a qualquer coisa que a plataforma render em cima; múltiplos de 2 (`gap-1.5`, `gap-2.5`) quebram esse alinhamento sem ganhar nada.
- **Escala do Tailwind default já é o grid** — `-1`/`-2`/`-3`/`-4`/`-6`/`-8` mapeiam pra 4/8/12/16/24/32px. Não vale customizar em `tailwind.config.js` como fizemos com tipografia; aqui a default já é a decisão.
- **Um valor por papel.** A auditoria pegou `p-4`/`p-2.5`/`gap-8`/`gap-2.5` misturados sem critério — a diferença entre `p-3` (12px) e `p-2.5` (10px) não é uma decisão de design, é um pixel arbitrário.

### O que a fatia mudou (#160)

Substituições em ~10 arquivos (`app/*.jsx`, `components/*.jsx`, `components/metrics/*.jsx`):

- `gap-1.5` → `gap-2` (6×)
- `gap-2.5` → `gap-3` (5×)
- `gap-5` → `gap-4` (1×, CounterField — único off-grid)
- `p-1.5` → `p-2` (5×)
- `p-2.5` → `p-3` (6×)

Efeito visual: +2px na maioria dos casos (imperceptível), -4px no CounterField.

Nada muda no `tailwind.config.js` — a decisão é usar a escala default como-é. O `px-*`/`py-*` assimétrico de botões e inputs (`px-2 py-1`, `px-4 py-2`) fica como está — a assimetria horizontal/vertical é intencional pra esse tipo de controle.

### Como validar

Zero valor off-grid no repo:

```bash
git grep -nE '\b(gap|p|px|py|pt|pb|pl|pr)-(1\.5|2\.5|5|7|9|10)\b' -- '*.jsx' '*.js'
```

Deve retornar vazio.

### O que NÃO está resolvido aqui

- **`px-*`/`py-*` de botões/inputs** — hoje `MyButton` usa `px-4 py-2`, `MyInput` usa `px-2 py-1`. São decisões de forma do controle, não de layout — ficam pra fatia de componentização, quando componentes ganharem forma canônica.
- **Marginação por classe** (`mx-`, `my-`, `mt-`, `mb-`) — o repo mal usa margin (o layout é quase todo `gap-*` em flex). Se aparecer, cai na mesma escala.

---

## Sombra (`shadow`) — fatia 4

**Regra:** um único nível de elevação, aplicado por `style`. Não há hierarquia de sombra hoje.

| Token                                         | Definição                                                                                               | Papel                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `shadow` (objeto RN em `constants/Colors.js`) | `elevation: 4`, `shadowColor: "#000"`, `shadowOffset: {0, 4}`, `shadowOpacity: 0.25`, `shadowRadius: 4` | Elevação padrão: top-level cards e controles |

Uso: `style={shadow}` ou `style={[shadow, otherStyle]}`.

### Regras de aplicação

1. **Top-level card** (direto no `ScrollView`, topo do conteúdo da tela) → aplica `shadow`.
2. **Nested card** (dentro de outro card, tipo `DurationField` dentro do form) → **sem** shadow. Evita dupla elevação.
3. **Controle** (`MyButton`, `MyIconButton`) → shadow embutido no componente — quem usa não precisa lembrar.

### Rationale

- **Um nível é o mínimo útil hoje.** O app não tem modal, dropdown, popover ou drawer flutuante — o único plano acima do fundo é "card + botão". Adicionar níveis (ex: `shadow-sm`, `shadow-lg`) só ganha valor quando houver hierarquia visual pedindo.
- **Objeto RN, não Tailwind class.** `shadow-*` do Tailwind gera `box-shadow` CSS — no web funciona, no native o NativeWind traduz mas com semântica diferente (elevation Android vs shadowX iOS). Manter em objeto RN é explícito e portável entre plataformas.
- **`style={shadow}` como pattern.** Consistente com `Snackbar`/inputs que já usam `style` inline pra props RN puras.

### O que a fatia mudou (#163)

- `components/metrics/MetricScreen.jsx` — adiciona `import { shadow }` e aplica `style={shadow}` no card top-level do form. Alinha com as 6 telas topo-nível que já tinham (index, history, admin, feedback, roadmap, InstallApp.web). Miss de quando `MetricScreen` foi montado (M2, #80).

### Como validar

Todos os cards top-level do repo têm `style={shadow}`:

```bash
git grep -B1 -A2 '${CARD}\|max-w-\[640px\].*rounded-lg' -- '*.jsx'
```

Deve mostrar `style={shadow}` acompanhando cada card top-level (com exceção dos cards nested como `DurationField` — regra 2).

### O que NÃO está resolvido aqui

- **Migrar pra `tailwind.config.js` `boxShadow`** — requer validar NativeWind renderizando igual em native (elevation/shadowX). Fora de escopo; hoje o objeto RN é a fonte da verdade.
- **Segundo nível de elevação** (`shadow-lg` pra modal, `shadow-sm` pra chip) — só faz sentido quando o app ganhar esses componentes; fatia própria.

---

## Próximas fatias

- **Cor** — separar semântica (`selected`, `success`, `danger`) do papel visual atual do `bg-secondary`, e criar `border`/`placeholder` tokens que respondam ao dark mode.
