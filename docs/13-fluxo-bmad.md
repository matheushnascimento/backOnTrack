# Fluxo de trabalho com o BMad Method

Desde 10/11/2026 o projeto usa o [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD) v7 (alpha, `6.13.0-next`) pra planejar, implementar e revisar. Ele entra na etapa de planejar e implementar do fluxo que já existia. Push, PR, validação no aparelho e merge seguem pelas mesmas portas de antes.

## O que foi instalado

| caminho                 | o que é                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `.claude/skills/bmad*`  | as 32 skills do BMad, copiadas (não linkadas), no escopo do projeto                               |
| `.claude/skills/bmod-*` | metadados dos módulos (`core-tools`, `method`, `founder`, `toolsmith`)                            |
| `skills-lock.json`      | origem e hash de cada skill, pro `npx skills update`                                              |
| `_bmad/`                | runtime compartilhado (scripts Python rodados com `uv run`) e `config.toml`                       |
| `_bmad/custom/`         | customizações do time, que sobrevivem às atualizações; `*.user.toml` é pessoal e fica fora do git |
| `_bmad-output/`         | onde o BMad escreve planos, PRDs e tickets; é texto nosso, e as checagens valem pra ele           |

Os arquivos vendorizados ficam fora do Prettier (`.prettierignore`) e da barreira de travessão (`TERCEIROS` em `scripts/check-em-dash.js`). Reformatá-los quebraria o hash do `skills-lock.json` na próxima atualização.

Pré-requisito novo: [uv](https://docs.astral.sh/uv/), em `~/.local/bin`.

## O fluxo de uma mudança

| etapa                      | quem faz                     | sai daqui                                                |
| -------------------------- | ---------------------------- | -------------------------------------------------------- |
| 1. issue e branch          | `feature-start`              | issue em português, branch `<tipo>/<N>-<slug>` em inglês |
| 2. planejar e implementar  | `bmad-build`                 | plano em `_bmad-output`, código, revisão, commit local   |
| 3. push e PR               | `safe-push`                  | PR em português; o staging publica sozinho               |
| 4. **validar no aparelho** | o usuário, no BoT Staging    | OK pra mergear                                           |
| 5. merge e fechamento      | `pr-merge`, `feature-finish` | squash na main, issue fechada                            |

O `bmad-build` nunca dá push (`step-05-present.md`), e o `on_complete` em `_bmad/custom/bmad-build.toml` o faz parar depois do commit. A porta do staging continua sendo o usuário: CI verde não basta.

### Trabalho maior que uma sessão

Um épico passa pela Sofia (`bmad-agent-po`), que escreve os requisitos e fatia as histórias num `tickets.toml` dentro de `_bmad-output`. Cada história vira uma issue e uma branch próprias e entra no fluxo acima. O `bmad-retrospective` fecha o épico. A issue do GitHub continua sendo onde o trabalho é rastreado e fechado; o `tickets.toml` é o plano.

Mudança trivial (typo, ignore, config) dispensa o BMad, como a própria documentação dele diz.

## Manutenção

- **Atualizar:** pedir ao `bmad` um `bmad setup`, que roda `npx skills update -p -y` quando há versão nova e refaz `_bmad/scripts`. A v7 é alpha e muda com frequência: conferir o diff antes de commitar.
- **Status:** `bmad status`.
- **Telemetria:** o Skills CLI manda evento de instalação. Rodar com `DO_NOT_TRACK=1`.

## Pendente

- **`AGENTS.md`**, pelo `bmad-project-context`. As lentes de revisão do `bmad-build` leem as regras do `AGENTS.md` ou do `CLAUDE.md`, e o projeto não tem nenhum dos dois. Até lá, as regras principais vão como `persistent_facts` na customização do Build.
