// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Componente-base "card" — outer container das telas topo-nível.
// Encapsula os tokens do M5: raio lg (papel "card"), bg surface por tema,
// max-w 640 (o único breakpoint do app), padding p-4 canônico e a sombra
// padrão (regra "top-level card → shadow"). Ver docs/08-design-tokens.md.

import MyView from "./MyView";
import { shadow } from "@/constants/Colors";

export default function Card({ className, style, ...props }) {
  return (
    <MyView
      safe={false}
      className={`w-full max-w-[640px] rounded-lg bg-light-backgroundCard p-4 dark:bg-dark-backgroundCard ${className ?? ""}`}
      style={[shadow, style]}
      {...props}
    />
  );
}
