#!/usr/bin/env bash
# PreToolUse hook: bloqueia `git commit` quando o stage adiciona travessão de
# prosa. A regra e as exceções vivem em scripts/check-em-dash.js, o mesmo
# módulo que o job "Texto" do CI usa. Ver #302 e #310.
#
# Este hook só pega commits feitos pelo Claude. A barreira que vale pra todo
# mundo é a do CI; esta existe pra dar o retorno antes de gastar um ciclo.
#
# Escape: SKIP_EM_DASH_CHECK=1 no env.
#
# Exit 0 = allow; exit 2 = block (stderr vai pro Claude).

set -euo pipefail

if [ "${SKIP_EM_DASH_CHECK:-}" = "1" ]; then
  exit 0
fi

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# Só `git commit` como comando principal, ancorado no início. Evita disparar
# quando outro comando cita a string "git commit" dentro de um argumento.
if ! printf '%s' "$cmd" | grep -qE '^[[:space:]]*git[[:space:]]+commit\b'; then
  exit 0
fi

if node scripts/check-em-dash.js; then
  exit 0
fi

exit 2
