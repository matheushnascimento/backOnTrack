# backOnTrack

App de acompanhamento de hábitos e métricas diárias, feito em **React Native + Expo**. Registre seu dia em cinco categorias — água, sono, exercício, alimentação e estudo — com nota de 0 a 5, observação e quantidade/duração, e acompanhe seu histórico de registros.

> A interface do app é em português (pt-BR).

> ⚠️ **Projeto em beta.** Atualmente os dados são mantidos apenas em memória (via [TinyBase](https://tinybase.org/)) e **são perdidos ao recarregar o app**. Persistência com SQLite ainda não foi implementada.

## Funcionalidades

- **Registro diário** em cinco categorias:
  - 💧 **Água** (ml)
  - 😴 **Sono** (h)
  - 🏋️ **Exercício** (h — com opções de Treino/Cardio e tempo de treino)
  - 🍽️ **Alimentação** (refeições)
  - 📚 **Estudo** (h — com duração em horas:minutos e marcação "Feito")
- Cada registro tem **nota de 0 a 5**, campo de **observação** e **quantidade/duração**.
- **Histórico de registros** por categoria, exibido em cards.
- **Histórico por mês** (disponível atualmente para a categoria Água).
- Suporte a **tema claro/escuro** (segue o esquema de cores do sistema).

> Observações de estado atual: as telas `app/export.jsx` e o componente `components/MyInput.jsx` ainda são stubs (não implementados), e apenas a categoria Água possui tela de histórico por mês.

## Stack / Tecnologias

- **[Expo](https://expo.dev/)** 53 + **React Native** 0.79 + **React** 19
- **[Expo Router](https://docs.expo.dev/router/introduction/)** 5 — roteamento baseado em arquivos
- **[NativeWind](https://www.nativewind.dev/)** 4 + **[Tailwind CSS](https://tailwindcss.com/)** 3 — estilização
- **[React Native Paper](https://reactnativepaper.com/)** — componentes de UI (Button, Card, Snackbar)
- **[Lucide](https://lucide.dev/)** + Material Design Icons — ícones
- **[TinyBase](https://tinybase.org/)** — store de dados (em memória; `expo-sqlite` já está configurado como plugin, mas ainda não é utilizado)
- Deploy web estático via **[Vercel](https://vercel.com/)**

## Pré-requisitos

- **Node.js 22** (LTS "Jod" — versão usada na CI)
- **npm**
- **Expo** (o cliente Expo Go no dispositivo, ou emulador Android / simulador iOS para builds nativos)

## Instalação

```bash
npm install
```

## Como rodar

```bash
npm start          # inicia o Expo (modo --tunnel)
npm run web        # roda no navegador
npm run android    # roda em emulador/dispositivo Android
npm run ios        # roda em simulador/dispositivo iOS
```

## Estrutura do projeto

```
backOnTrack/
├── app/                     # Rotas (Expo Router, file-based)
│   ├── _layout.jsx          # Stack raiz
│   ├── index.jsx            # Tela inicial (lista as 5 categorias)
│   ├── export.jsx           # (stub)
│   ├── (metrics)/           # Telas de registro por categoria
│   │   ├── _layout.jsx      # Stack + seletor de categorias (MyHeader)
│   │   ├── water.jsx
│   │   ├── sleep.jsx
│   │   ├── exercise.jsx
│   │   ├── feeding.jsx
│   │   └── study.jsx
│   └── (history)/           # Telas de histórico
│       ├── _layout.jsx
│       └── water.jsx        # Histórico de água com seletor de mês
├── components/              # Componentes reutilizáveis
│   ├── MyView.jsx           # View com safe-area e tema
│   ├── MyHeader.jsx         # Seletor de categorias / de mês
│   ├── MyHistory.jsx        # Listagem de registros em cards
│   ├── Score.jsx            # Seletor de nota 0–5
│   ├── MyButton.jsx         # Wrapper de botão (Paper)
│   ├── MyCheckbox.jsx
│   └── categoryUtils.jsx    # Mapa das categorias e helpers
├── constants/
│   ├── Colors.js            # Paleta e temas claro/escuro
│   └── getDate.js           # Utilitário de data (ISO + DD/MM/YYYY)
├── hook/
│   └── useThemedStyle.js    # Hook de estilos com tema
├── infra/
│   └── database.js          # Store TinyBase (add / get / getByMonth)
├── tests/
│   └── test.js              # Teste placeholder (Jest)
├── assets/                  # Ícones e splash
├── app.json                 # Configuração do Expo
└── package.json
```

## Scripts disponíveis

| Script | Comando | Descrição |
| --- | --- | --- |
| `start` | `expo start --tunnel` | Inicia o servidor de desenvolvimento Expo (tunnel) |
| `android` | `expo run:android` | Build/execução no Android |
| `ios` | `expo run:ios` | Build/execução no iOS |
| `web` | `expo start --web` | Execução no navegador |
| `vercel-build` | `expo export` | Export estático para deploy (Vercel) |
| `lint:prettier:check` | `prettier --check .` | Verifica formatação |
| `lint:prettier:fix` | `prettier --write .` | Corrige formatação |
| `lint:eslint:check` | `eslint .` | Verifica lint com ESLint |

## Lint e padrão de commits

- **ESLint** (flat config, ESLint 9) e **Prettier** para lint/formatação.
- **[Conventional Commits](https://www.conventionalcommits.org/)** são obrigatórios: um hook de `commit-msg` do **Husky** valida a mensagem via **commitlint** (`@commitlint/config-conventional`).
- A **CI** (`.github/workflows/linting.yaml`) roda em cada Pull Request três verificações: Prettier, ESLint e commitlint.

Exemplo de mensagem de commit válida:

```
feat: adiciona tela de histórico de sono
docs: atualiza README
```

## Testes

O **Jest** está instalado e há um teste placeholder em `tests/test.js`. Ainda não existe um script `test` configurado no `package.json` nem uma suíte de testes real.

## Deploy

O app é publicado como export estático na web via **Vercel**: o `vercel-build` roda `expo export` gerando a pasta `dist`, e o `vercel.json` faz o roteamento SPA (todas as rotas caem em `/index.html`).

## Licença

Distribuído sob a licença **MIT**. Veja o arquivo [`LICENSE`](./LICENSE) — © 2025 Matheus Nascimento.
