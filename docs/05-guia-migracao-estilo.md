# Guia de Migração de Estilo: CSS-web → NativeWind

O código atual mistura três coisas: `StyleSheet`/`useThemedStyles`, `className` (NativeWind) e valores de CSS web (`rem`, `boxShadow`, `fit-content`) que não são nativos do React Native. Eles renderizam no preview do navegador, mas quebram ou são ignorados no Android.

Este guia é o mapa "de → para" pra migrar cada tela pra um sistema só (NativeWind), com valores que funcionam no Android.

## Regra mental

Não existe `rem` no React Native nativo. `16px` no navegador ≈ `1rem`. A base do RN é o **número puro** (`fontSize: 16`), sem unidade. Na prática, para converter `rem` → número: **multiplique por 16** (`1.6rem` → `26`, arredondando; `.4rem` → `6`; `1.2rem` → `19`). Ajuste no olho depois, rodando no Android.

No NativeWind, o Tailwind já usa uma escala própria (`text-base`, `p-2`, etc.) que resolve isso, então prefira as classes da escala a valores arbitrários `[..]`.

## Tabela de conversão

| CSS-web (atual)                            | NativeWind (className)                | Observação                                |
| ------------------------------------------ | ------------------------------------- | ----------------------------------------- |
| `fontSize: "1.6rem"`                       | `text-2xl` (~24px) ou `text-[24px]`   | prefira a escala; evite `text-[1.6rem]`   |
| `fontSize: "1.2rem"`                       | `text-lg` (~18px)                     |                                           |
| `fontSize: 18`                             | `text-lg`                             | número já era válido, mas unifique        |
| `fontWeight: "bold"`                       | `font-bold`                           |                                           |
| `padding: ".4rem"`                         | `p-1.5` (~6px)                        |                                           |
| `padding: 10`                              | `p-2.5` (10px)                        |                                           |
| `gap: "1rem"`                              | `gap-4` (16px)                        |                                           |
| `gap: ".6rem"`                             | `gap-2.5` (~10px)                     |                                           |
| `borderRadius: ".6rem"`                    | `rounded-md`                          |                                           |
| `borderRadius: "100%"`                     | `rounded-full`                        | `100%` não existe em RN                   |
| `maxWidth: "40rem"`                        | `max-w-[640px]`                       |                                           |
| `width: "fit"` / `"fit-content"`           | `self-start` ou remover               | RN não tem fit-content; a View já encolhe |
| `height: "fit-content"`                    | remover                               | idem                                      |
| `display: "flex"`                          | remover                               | tudo em RN já é flex; string dá warning   |
| `flexDirection: "row"`                     | `flex-row`                            |                                           |
| `border: "solid 1px #333"`                 | `border border-[#333]`                | RN quer borderWidth + borderColor         |
| `boxShadow: Colors.shadow`                 | `style={shadow}` (import)             | ver abaixo, sombra fica fora do className |
| `backgroundColor: "#333"` / `bg-[#333333]` | `bg-dark-background`                  | use o token, não o hex hardcoded          |
| `color: "white"`                           | `text-white`                          |                                           |
| `color: theme.text`                        | `text-light-text dark:text-dark-text` | NativeWind resolve dark/light sozinho     |

## Cores: use os tokens, não os hex

Depois que o `tailwind.config.js` passa a importar do `Colors.js`, você tem estes tokens no `className`:

- `bg-primary`, `text-primary`, `border-primary` (azul `#2E5A88`)
- `bg-secondary` (verde `#4CAF50`)
- `bg-light-background` / `bg-dark-background`
- `text-light-text` / `text-dark-text`
- `bg-light-backgroundCard` / `bg-dark-backgroundCard`

Nunca mais escreva `bg-[#2E5A88]` ou `bg-[#333333]`. Quando a cor mudar no `Colors.js`, o token acompanha sozinho; o hex hardcoded não.

## Dark mode

NativeWind lê o color scheme do sistema com o prefixo `dark:`. Isso substitui todo o padrão atual de `Colors[colorScheme] ?? Colors.light` espalhado em cada componente:

```jsx
// antes: lógica manual de tema em cada arquivo
const theme = Colors[colorScheme] ?? Colors.light;
<View style={{ backgroundColor: theme.background }} />

// depois: NativeWind resolve
<View className="bg-light-background dark:bg-dark-background" />
```

Pra isso funcionar, garanta que o `darkMode` do NativeWind está ativo (o preset já cuida disso na maioria dos setups) e que o app declara suporte a dark mode no `app.json` (`"userInterfaceStyle": "automatic"`).

> **Estado atual (#65):** o `app.json` já está em `"userInterfaceStyle": "automatic"`, e o tema claro/escuro real está ligado e segue o sistema. Sempre escreva as duas variantes (`text-light-x dark:text-dark-x`); classes fixas como `text-white` só valem sobre fundo que é escuro nos dois temas.

## Cache: reinicie com `--clear` ao mexer em fontes de build

Nem tudo é resolvido em runtime. Algumas coisas são compiladas em **build** e ficam no cache do Metro, e editá-las **não reflete** no app até reiniciar limpando o cache:

```bash
npx expo start --tunnel --clear
```

Isso vale para: `constants/Colors.js` e `tailwind.config.js` (as cores de `className` são geradas em build), `babel.config.js`, e qualquer arquivo importado via `babel-plugin-inline-import` (ex.: o `docs/04-roadmap-milestones.md` exibido na Home). Sintoma clássico: você troca uma cor no `Colors.js` ou edita o roadmap e "nada acontece". É o cache. Já mudanças em `style={{...}}` ou em `Colors.x` usados via JS atualizam na hora (são runtime).

## Sombra: o único caso que NÃO vai pro className

Sombra em RN é um objeto de estilo (elevation no Android), não uma classe utilitária limpa. Mantenha via `style`, importando o objeto `shadow` corrigido:

```jsx
import { shadow } from "@/constants/Colors";

<View className="bg-light-backgroundCard rounded-md p-2.5" style={shadow} />;
```

Pode combinar `className` + `style` no mesmo elemento sem problema: o `className` cuida do layout/cor, o `style` cuida da sombra.

## Ordem de ataque, por arquivo

1. Comece por **um** arquivo já unificado como referência (sugiro `water.jsx`, a métrica mais simples).
2. Rode no Android **antes e depois**, comparando lado a lado.
3. Só passe pro próximo arquivo quando o anterior renderizar igual (ou melhor) no Android.
4. Componentes compartilhados primeiro (`MyView`, `MyButton`, `Score`, `MyCheckbox`), telas depois, assim a correção do componente já beneficia todas as telas que o usam.

## Não esqueça

- Os **componentes compartilhados já foram migrados** em #60 (`MyButton`/`MyIconButton` reescritos com `Pressable` + `className`, `MyView`, `Score`, `MyCheckbox`, `MyHeader`, e `MyInput` implementado). Ao migrar as telas, confie neles: passe `className`/`titleClassName` ao `MyButton` (a API antiga `styles`/`titleStyle` foi removida) e use os tokens de cor em vez de hex.
- O `MyButton` agora expõe `className`, `titleClassName`, `style` (escape hatch p/ objeto RN como a `shadow`). Não passe mais valores CSS-web (`marginHorizontal: "1rem"`, `height: "fit-content"`); use `mx-4`, `self-start`, etc.
