// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Rótulo de campo de formulário (FIELD LABEL). "MIN"/"MAX"/"IDEAL",
// "OBS:", "Nota", "Hora do treino"… Papel diferente do SectionLabel — ver
// docs/08-design-tokens.md.

import { Text } from "react-native";

export default function FieldLabel({ className, children, ...props }) {
  return (
    <Text
      className={`font-bold text-lg text-light-text dark:text-dark-text ${className ?? ""}`}
      {...props}
    >
      {children}
    </Text>
  );
}
