// @ts-nocheck -- SVG inline por métrica; tipos exportados não usados
import Svg, { Path } from "react-native-svg";

// SVGs por métrica extraídos das mockups do Turno 2 (Claude Design).
// 24x24 viewBox, stroke 2, round caps, pattern do design.
// Cor do stroke é controlada pela cor passada (default = brand-blue).
const PATHS = {
  water: ["M12 2.5c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"],
  sleep: ["M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"],
  exercise: [
    "M6 4v16",
    "M18 4v16",
    "M4 8h4",
    "M4 16h4",
    "M16 8h4",
    "M16 16h4",
    "M8 12h8",
  ],
  feeding: ["M4 4c0 8 4 10 8 10s8-2 8-10", "M4 14c0 4 4 6 8 6s8-2 8-6"],
  study: ["M3 6l9-3 9 3v10l-9 3-9-3z", "M12 3v18"],
};

export default function MetricIcon({ metric, size = 22, color = "#2E5A88" }) {
  const paths = PATHS[metric];
  if (!paths) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
