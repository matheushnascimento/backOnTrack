// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Rótulo de seção (SECTION LABEL). Aparece como cabeçalho de bloco dentro
// dos cards ("MÉTRICAS DE HOJE", "UTILITÁRIOS", "HISTÓRICO"…). Papel
// tipográfico diferente do FieldLabel. Ver docs/08-design-tokens.md.

import { Text } from "react-native";

export default function SectionLabel({ className, children, ...props }) {
  return (
    <Text
      className={`font-bold text-xs text-light-text opacity-60 dark:text-dark-text ${className ?? ""}`}
      {...props}
    >
      {children}
    </Text>
  );
}
