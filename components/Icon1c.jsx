// @ts-nocheck -- SVG inline, sem tipos exportados
import Svg, { Circle, Path } from "react-native-svg";

// Símbolo "1c · Linha que sobe" — a marca escolhida pra identidade visual v2.
// Curva ascendente + círculo verde no ponto de partida. Reusável pra header,
// splash e (fatia 6) os 4 assets de app.json (icon/adaptive/splash/favicon).
//
// Ver docs/09-design-v2.md § "O que vem quando" pra rollout do ícone real
// nos assets nativos.
//
// Props:
//   size          — largura/altura em px (default 32)
//   strokeColor   — cor da curva (default #F8F9FA — over blue bg)
//   dotColor      — cor do ponto de partida (default #4CAF50)
export default function Icon1c({
  size = 32,
  strokeColor = "#F8F9FA",
  dotColor = "#4CAF50",
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Path
        d="M 180 760 Q 460 760 560 520 T 860 280"
        fill="none"
        stroke={strokeColor}
        strokeWidth={110}
        strokeLinecap="round"
      />
      <Circle cx={180} cy={760} r={100} fill={dotColor} />
    </Svg>
  );
}
