// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MyView({ className, style, safe = true, ...props }) {
  const insets = useSafeAreaInsets();

  if (!safe) return <View className={className} style={style} {...props} />;

  return (
    <View
      className={className}
      style={[
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
        style,
      ]}
      {...props}
    />
  );
}
