#!/usr/bin/env bash
# PreToolUse hook — bloqueia `git commit` quando o subject line (1ª linha da
# mensagem) parece português. Padrão do repo é inglês (CONTRIBUTING.md).
# Configurado em .claude/settings.json.
#
# Detecta PT por: (1) acentos, (2) blocklist de verbos/palavras PT comuns em
# commits que não colidem com inglês. Escape: SKIP_COMMIT_LANG_CHECK=1 no env.
#
# Exit 0 = allow; exit 2 = block (stderr vai pro Claude).

set -euo pipefail

# Escape valve — usuário pode desativar via env var pontualmente.
if [ "${SKIP_COMMIT_LANG_CHECK:-}" = "1" ]; then
  exit 0
fi

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# Só nos interessa `git commit` como o COMANDO principal (ancorado no início da
# string, opcionalmente precedido de whitespace). Isso evita falso-positivo
# quando outros comandos (ex.: `gh pr create --body "...git commit..."`) citam
# a string "git commit" dentro de argumentos.
if ! printf '%s' "$cmd" | grep -qE '^[[:space:]]*git[[:space:]]+commit\b'; then
  exit 0
fi

# Sem -m/--message => abre editor; fora do escopo deste hook.
if ! printf '%s' "$cmd" | grep -qE -- '(-m|--message)\b'; then
  exit 0
fi

subject=""

# HEREDOC (fluxo padrão pra commits com corpo longo).
# Extrai a 1ª linha não-vazia entre <<'EOF' (ou <<EOF) e o EOF terminador.
if printf '%s' "$cmd" | grep -qE "<<'?EOF'?"; then
  subject=$(
    printf '%s' "$cmd" \
      | awk '/<<'\''?EOF'\''?/{flag=1; next} /^[[:space:]]*EOF[[:space:]]*\)?/{flag=0} flag' \
      | grep -m1 -v '^[[:space:]]*$' || true
  )
fi

# Fallback: extrai o valor logo após -m ou --message.
if [ -z "$subject" ]; then
  subject=$(
    printf '%s' "$cmd" \
      | grep -oE -- "(-m|--message)([[:space:]]+|=)(\"[^\"]*\"|'[^']*'|[^[:space:]]+)" \
      | head -1 \
      | sed -E "s/^(-m|--message)([[:space:]]+|=)//; s/^[\"']//; s/[\"']$//" \
      | head -1 || true
  )
fi

if [ -z "$subject" ]; then
  exit 0
fi

# --- Sinal 1: acentos PT ---
accents='áàãâéêíóôõúüçÁÀÃÂÉÊÍÓÔÕÚÜÇ'
if printf '%s' "$subject" | LC_ALL=C.UTF-8 grep -q "[$accents]"; then
  found=$(printf '%s' "$subject" | LC_ALL=C.UTF-8 grep -oE "[$accents]" | head -1)
  cat >&2 <<MSG
Commit subject em português detectado (acento '$found').

  Subject: "$subject"

Padrão do repo é inglês — ver CONTRIBUTING.md. Reescreva o subject e tente de novo.
(Escape emergencial: prefixe com SKIP_COMMIT_LANG_CHECK=1 se o hook errou.)
MSG
  exit 2
fi

# --- Sinal 2: palavras PT-only comuns em commit messages ---
# Lista conservadora — palavras que quase certamente indicam PT em contexto de
# commit e não colidem com inglês. Match é word-boundary, case-insensitive.
pt_words='trata|tratando|melhora|melhorando|melhoria|corrige|corrigindo|adiciona|adicionando|atualiza|atualizando|marca|marcando|entrega|entregue|entregando|ajusta|ajustando|deixa|deixando|evita|evitando|garante|garantindo|arruma|arrumando|renomeia|renomeando|reescreve|reescrevendo|separa|separando|junta|juntando|apaga|apagando|puxa|puxando|sobe|subindo|desce|descendo|acha|achando|coloca|colocando|tira|tirando|manda|mandando|fatia|arquivo|pasta|tela|escolha|mensagem|chave|senha|retorno|pacote|padrao|versao|sessao|conexao|estado|erro|erros|ponto|caminho|nome|nomes|tudo|nada|algum|alguma|apenas|somente|entao|senao|porque|quando|onde|com|sem|sobre|pelo|pela|pra|pro|para|dos|das'

if printf '%s' "$subject" | grep -oE -i -w "($pt_words)" >/dev/null 2>&1; then
  found=$(printf '%s' "$subject" | grep -oE -i -w "($pt_words)" | head -1)
  cat >&2 <<MSG
Commit subject em português detectado (palavra: '$found').

  Subject: "$subject"

Padrão do repo é inglês — ver CONTRIBUTING.md. Reescreva o subject e tente de novo.
(Escape emergencial: prefixe com SKIP_COMMIT_LANG_CHECK=1 se o hook errou.)
MSG
  exit 2
fi

exit 0
