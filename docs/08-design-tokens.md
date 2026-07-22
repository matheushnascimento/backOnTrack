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

**Regra:** só a escala Tailwind, um valor por papel. Zero uso de `text-[Npx]` (pixel cru fora da escala).

| Token       | Papel                                              | Onde usar                                                                                 |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `text-xs`   | Rótulo de seção (SECTION LABEL)                    | "MÉTRICAS DE HOJE", "UTILITÁRIOS", "HISTÓRICO"… nos cards das telas topo-nível            |
| `text-base` | Corpo                                              | Linhas de métrica na Home, texto de item de histórico, descrições secundárias             |
| `text-lg`   | Rótulo de campo (FIELD LABEL) e valores destacados | "MIN"/"MAX"/"IDEAL", "OBS:", "Nota", "Hora do treino", input de observação, badge da nota |
| `text-2xl`  | Título de card                                     | "Hoje", "Enviar feedback", "Testers", inputs grandes de métrica                           |

### Rationale

- **A escala Tailwind já é canônica** — `text-xs`, `text-base`, `text-lg` e `text-2xl` cobrem os papéis do app hoje. `text-sm`, `text-xl` e `text-3xl` estão disponíveis se aparecer um degrau a mais adiante, mas até lá ficam sem uso.
- **Pixel cru é sintoma, não escolha.** Todo `text-[Npx]` no repo vinha de "queria um pouco maior/menor" — sinal de que faltava um degrau. Alinhar com a escala do Tailwind mata a arbitrariedade e mantém a proporção coerente.
- **Nome do papel importa mais que o número.** `LABEL` estava sendo usado com dois significados diferentes (rótulo de seção `text-xs opacity-60` × rótulo de campo `text-lg`) — a fatia adota `FIELD_LABEL` nos arquivos de métrica pra desambiguar. O `LABEL` das telas topo-nível fica como está até a fatia de componentização, quando vira `SectionLabel` como componente.

### O que a fatia mudou (#157)

- `global.css` — remove `font-size: 62.5%`. Aplicado em `*`, o valor efetivo compõe a cada nível de aninhamento (§4 da auditoria); NativeWind gera px direto sem depender de `rem`, então era **dead code no web e ignorado no native**.
- `components/metrics/fields.jsx` (3×) e `components/metrics/registry.jsx` (1×) — `text-[26px]` → `text-2xl` (24px). Diferença de 2px, imperceptível na prática.
- `components/metrics/MetricScreen.jsx` — `text-[19px]` → `text-lg` (18px) no `TextInput` de observação. Diferença de 1px.
- `components/metrics/MetricScreen.jsx`, `components/metrics/fields.jsx`, `components/metrics/registry.jsx` — `LABEL` → `FIELD_LABEL`. Escopo local (constantes por arquivo), não afeta consumidores.

### Como validar

Zero pixel cru de fonte no repo:

```bash
git grep -nE 'text-\[[0-9]+px\]' -- '*.jsx' '*.js' '*.css'
```

Deve retornar vazio.

### O que NÃO está resolvido aqui

- **Constante `LABEL` das telas topo-nível** (6 arquivos, mesma string byte a byte) — vai virar `SectionLabel` na fatia de componentização, junto com `CardLabel`/`Card` (§1 da auditoria).
- **Peso e altura de linha** (`font-bold`, `leading-*`) — hoje `font-bold` é aplicado direto onde aparece; se um dia virar decisão de token, fica pra fatia própria.

---

## Próximas fatias

- **Espaçamento** — hoje mistura `p-4`/`p-2.5`/`gap-8`/`gap-2.5` sem critério; escolher 2-3 valores canônicos.
- **Sombra** — hoje `shadow` (objeto RN em `constants/Colors.js`) é aplicado como `style={shadow}` em cada card; virou de fato um token, só falta documentar aqui.
- **Cor** — separar semântica (`selected`, `success`, `danger`) do papel visual atual do `bg-secondary`, e criar `border`/`placeholder` tokens que respondam ao dark mode.
