# Auditoria de UI — Back on Track

Primeiro item do M5 (Design System & Consistência de UI). Levantamento do estado atual — sem mudar código — pra virar alvo dos próximos itens da milestone (tokens, componentização, revisão do `MyHeader`, responsividade web).

Cada achado aponta arquivo/linha. Onde fez sentido, a severidade: **funcional** (comportamento diverge do esperado, não só estética) vs **visual/manutenção** (inconsistente, mas não quebra nada sozinho).

---

## 1. Cards duplicados (`CARD`/`LABEL`)

O roadmap já sinalizava "`CARD`/`LABEL` repetidos em 3 telas". Na prática são **6 arquivos** com a mesma string literal copiada byte a byte:

```
"w-full max-w-[640px] rounded-lg bg-light-backgroundCard p-4 dark:bg-dark-backgroundCard"
"font-bold text-xs text-light-text opacity-60 dark:text-dark-text"
```

- [app/index.jsx:22-25](../app/index.jsx)
- [app/history.jsx:17-20](../app/history.jsx)
- [app/admin.jsx:22-25](../app/admin.jsx)
- [app/feedback.jsx:17-20](../app/feedback.jsx)
- [app/roadmap.jsx:18-21](../app/roadmap.jsx)
- [components/InstallApp.web.jsx:27-30](../components/InstallApp.web.jsx)

Fora esse grupo, **mais três variantes** do mesmo conceito "card", cada uma com um valor ligeiramente diferente e nenhuma delas usando a constante acima:

- `components/MyHistory.jsx:72` — `rounded-md`, `p-2.5`, `gap-2.5` (não `rounded-lg`/`p-4`)
- `components/metrics/MetricScreen.jsx:96` — `gap-8`, `p-2.5`, sem `w-full`
- `components/metrics/fields.jsx:20-21` (`CARD` local) — `items-center gap-8 p-2.5`, sem `max-w`

**Ação sugerida:** extrair `Card`/`CardLabel` como componentes reais (não string constante repetida) em `components/`, com uma única fonte para raio/padding/gap. Decidir se o raio "card" é `md` ou `lg` — hoje as duas coexistem sem critério.

## 2. Raio (`rounded-*`) sem escala única

Quatro valores de raio em uso, sem token que diga qual serve pra quê:

| Valor                    | Onde                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `rounded-full`           | botões (`MyButton.jsx:17`, `MyIconButton` `:51`), badge de nota (`MyHistory.jsx:82`) |
| `rounded-lg`             | a maioria dos cards, inputs de métrica (`fields.jsx`)                                |
| `rounded-md`             | `MyHistory.jsx:72` (card), `registry.jsx:132/139` (inputs pequenos)                  |
| `rounded` (default, 4px) | `MyInput.jsx:25`                                                                     |

Nenhuma dessas escolhas parece intencional — é o valor que a pessoa que escreveu aquele trecho escolheu no momento.

## 3. Cor: sistema parcial, hex cru por fora

`constants/Colors.js` centraliza `primary`/`secondary`/`light`/`dark`, e o `tailwind.config.js` os expõe como token (`bg-primary`, `text-light-text`, etc.) — isso funciona bem onde é usado. Mas boa parte do app passa por fora do sistema com hex/paleta Tailwind default direto no `className`:

- `border-[#333]` — `MyInput.jsx:25`, `MyButton.jsx:54` (`MyIconButton`) — **não tem variante `dark:`**, então em tema escuro a borda (#333) some contra o fundo escuro (`dark.background` também é `#333333`, [Colors.js:13](../constants/Colors.js))
- `placeholderTextColor="#888"` — `MyInput.jsx:30`, fixo pros dois temas
- `color="#333"` no ícone de `MyButton` (`MyButton.jsx:33`) — ícone sempre escuro, mesmo dentro de um botão `bg-primary` escuro ou em tema escuro
- `android_ripple={{ color: "#00000022" }}` repetido em `MyButton.jsx:21` e `:57`
- `text-red-500` pra erro em `app/feedback.jsx:159` — única cor de "erro" do app, e não é um token do projeto, é a paleta default do Tailwind

**Achado funcional:** a borda de `MyInput` (item acima) provavelmente fica invisível em tema escuro — vale conferir visualmente antes de decidir o token de borda.

### 3.1 `bg-secondary` com três significados diferentes

O mesmo token é reaproveitado pra três papéis semânticos sem relação entre si:

1. **Selecionado/ativo** — chip de métrica e categoria selecionados (`MyButton.jsx:18`)
2. **Nota máxima** — badge de pontuação quando `obj.score === 5` (`MyHistory.jsx:83`)
3. **Ação destrutiva** — botão "Remover" tester (`app/admin.jsx:148`, `className="bg-secondary px-3 py-1"`)

Não há token de "destrutivo"/"perigo" no projeto — o "Remover" (delete) usa a mesma cor do "está selecionado" e do "nota perfeita".

## 4. Tipografia: três escalas coexistindo

- **Escala Tailwind** (`text-xs` a `text-2xl`) — a mais usada, nas 5 telas topo-nível e em `MyHistory`.
- **Pixels crus fora da escala** — `text-[26px]` (`fields.jsx:19,35,131`, `registry.jsx:29`), `text-[19px]` (`MetricScreen.jsx:112`, no `TextInput` de observação). Não correspondem a nenhum degrau do Tailwind (`text-2xl` = 24px, `text-3xl` = 30px).
- **`font-size: 62.5%` global** ([global.css:5-6](../global.css)), **só no bundle web** (é CSS puro, RN nativo ignora): aplicado ao seletor universal `*`, não a `html`/`:root`. O truque do "10px base" normalmente vai numa única regra na raiz — aqui, como todo elemento herda `font-size` do pai e o `*` reaplica 62.5% _de novo_ em cada nível, o tamanho efetivo composto depende da profundidade de aninhamento em vez de ser previsível. É provável causa de texto desproporcionalmente pequeno no web em árvores mais profundas — vale confirmar no navegador e, se confirmado, mover a regra pra `html`/`:root` (ou remover, já que RN nativo não tem o problema que o truque resolve).

Além disso, dois arquivos diferentes definem uma constante chamada `LABEL` com **papéis distintos** e nomes iguais — pode confundir quem for procurar "o token de label":

- Telas topo-nível: `font-bold text-xs ... opacity-60` (rótulo de seção, tipo "MÉTRICAS DE HOJE")
- `MetricScreen.jsx:24` / `fields.jsx:17`: `font-bold text-lg ...` sem opacidade (rótulo de campo de formulário)

## 5. `MyHeader`: navegação global vs. chips de métrica

O roadmap já desconfiava disso e a leitura do código confirma: `MyHeader` foi desenhado como a faixa de chips de métrica (água, sono, etc. — `components/MyHeader.jsx:39-47`, itera `CATEGORY_MAP`), mas é importado como se fosse **o header genérico do app**, inclusive em telas que não são de métrica:

- `app/admin.jsx:89`, `app/feedback.jsx:81`, `app/roadmap.jsx:50` — nenhuma tem relação com as 5 métricas, mas mostram a faixa de chips assim mesmo
- `app/(metrics)/_layout.jsx:23` já renderiza `MyHeader` no layout — e ainda assim `app/index.jsx`, `app/history.jsx` etc. importam e renderizam o próprio de novo na tela (duplicação do import/mount, não só do estilo)

Não há, hoje, um componente de "header de navegação genérico" (voltar, título da tela) — o app depende do `Stack` do Expo Router com `headerShown: false` ([app/_layout.jsx:23](../app/_layout.jsx)) e usa `MyHeader` (chips) como substituto em todo lugar, mesmo onde chips de métrica não fazem sentido.

**Achado funcional (tema escuro):** `app/_layout.jsx:5` e `app/(metrics)/_layout.jsx:5` leem `useColorScheme` de **`react-native`** (tema do SO), enquanto `app/index.jsx:5` e `MyButton.jsx:3` leem de **`nativewind`** (que responde ao `toggleColorScheme()` manual do botão "Alternar tema" nos Utilitários). Resultado: o `backgroundColor` inline calculado nesses dois `_layout.jsx` (via `Colors[colorScheme]`) **não muda** quando o usuário troca o tema manualmente — só as classes `dark:` (controladas pelo NativeWind) mudam. Vale confirmar visualmente se sobra uma faixa/contorno na cor do tema errado ao alternar manualmente.

**Achado funcional (padding duplicado):** `app/(metrics)/_layout.jsx:19` aplica `paddingTop: insets.top` na `View` raiz do grupo `(metrics)`, e a tela dentro dele (`MetricScreen.jsx:75`, via `MyView safe={true}`) aplica o mesmo `insets.top` de novo. As 5 telas topo-nível (`index`, `history`, etc.) não têm esse layout intermediário, então só pagam o inset uma vez. Ou seja, as telas de métrica podem ter espaço extra no topo comparado às demais — vale medir na tela.

## 6. `MyView safe={true}` como default arriscado

`MyView` ([components/MyView.jsx:5](../components/MyView.jsx)) aplica `paddingTop/Bottom: insets.top/bottom` quando `safe` não é passado — e o default é `true`. Isso é correto para o container de tela inteira, mas dois componentes pequenos e reutilizáveis **esquecem de passar `safe={false}`** e herdam o padding de safe-area por engano:

- `components/MyCheckbox.jsx:10` — `<MyView className="flex-row items-center gap-1.5">`, usado dentro de formulários (`registry.jsx:199,204,265`)
- `components/Score.jsx:10` — idem, usado dentro do card de nota em toda tela de métrica

Na prática isso deveria inflar essas linhas com o inset do dispositivo (tipicamente 20-50px), o que não parece intencional pra uma checkbox ou uma fileira de botões de nota. Vale checar visualmente se o espaçamento aparece.

## 7. Botão: `disabled` sem estado visual consistente

`MyButton` não tem tratamento de `disabled` embutido — cada tela resolve na mão, de formas diferentes:

- `app/history.jsx:92` — `style={isToday ? { opacity: 0.4 } : undefined}`
- `app/admin.jsx:122`, `app/feedback.jsx:168` — `className={cond ? "" : "opacity-50"}`

Duas opacidades diferentes (`0.4` vs `opacity-50` = 0.5) pro mesmo conceito de "desabilitado", e nenhuma centralizada no componente.

## 8. Responsividade web: um único breakpoint hardcoded

Não há uso de `sm:`/`md:`/`lg:` do Tailwind, nem `useWindowDimensions`, em nenhum arquivo do projeto. A única estratégia de responsividade é o literal `max-w-[640px]`, repetido (não extraído como token) em **8 arquivos**: `app/{index,history,admin,feedback,roadmap}.jsx`, `components/MyHistory.jsx`, `components/InstallApp.web.jsx`, `components/metrics/MetricScreen.jsx` (e variantes menores em `fields.jsx`/`registry.jsx` com `max-w-[160px]`/`max-w-[38px]`). Layout abaixo de 640px (mobile, que é o alvo principal) não tem nenhum ajuste dedicado — o app é o mesmo layout de coluna única esticando ou não até 640px.

## 9. Tela órfã sem estilo

`app/export.jsx` é um placeholder puro (`<Text>Hello World!</Text>`, sem `MyView`/`MyHeader`/tema) — rota já registrada em `app/_layout.jsx:30` (título "Exportação"), esperando a feature do M8 ("Exportação/backup de dados"). Não é uma inconsistência de design em si, mas se alguém navegar até `/export` hoje, quebra a experiência visual (fundo branco fixo, sem safe-area, sem dark mode) em vez de simplesmente não existir. Fora do escopo do M5, mas vale registrar pra quem for implementar o M8.

## 10. Possível bug de layout: `Text` com `flex-row`

`components/MyHistory.jsx:75` — `<Text className="w-full flex-row justify-between">` envolvendo dois `<Text>` filhos. Propriedades de flexbox (`flex-row`, `justify-between`) em RN só têm efeito em `View`, não em `Text` (que não é um container flex) — o alinhamento "nome à esquerda, nota à direita" pretendido pode não estar realmente acontecendo, e sim empilhando/fluindo como texto normal. Vale conferir visualmente no card de histórico.

---

## Resumo — o que isso alimenta nos próximos itens do M5

- **Tokens canônicos:** decidir e centralizar raio (`md` vs `lg`), cor de borda/placeholder, cor de "erro"/"destrutivo", e resolver o `LABEL` duplicado com papéis diferentes (§3, §4).
- **Componentizar:** `Card`/`CardLabel` de verdade em vez de string repetida em 6+ arquivos; estado `disabled` embutido no `MyButton` (§1, §7).
- **Revisar `MyHeader`:** separar "chips de métrica" (só faz sentido nas 5 telas de registro) de um header de navegação genérico pras demais telas — e resolver a divergência `useColorScheme` (react-native vs nativewind) e o padding duplicado no grupo `(metrics)` (§5).
- **Consertar o default de `MyView`:** `MyCheckbox` e `Score` devem passar `safe={false}` (§6).
- **Web:** revisar o truque `font-size: 62.5%` (aplicado a `*`, não à raiz) e considerar breakpoints reais em vez do `max-w-[640px]` hardcoded repetido (§4, §8).
- **Confirmar visualmente** (não dá pra provar só lendo código): borda invisível do `MyInput` no dark mode, alinhamento do `HistoryCard` (§10), padding extra nas telas de métrica (§5), e o efeito real do `font-size: 62.5%` no web (§4).
