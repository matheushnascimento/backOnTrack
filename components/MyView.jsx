import { Colors } from "@/constants/Colors";
import { useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MyView({ className, style, safe = true, ...props }) {
  const colorScheme = useColorScheme();
  const themes = Colors[colorScheme] || Colors.light;
  if (!safe)
    return (
      <View
        className={className}
        style={[{ backgroundColor: themes.background }, style]}
        {...props}
      />
    );

  const insets = useSafeAreaInsets();

  return (
    <View
      className={className}
      style={[
        {
          backgroundColor: themes.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
        style,
      ]}
      {...props}
    />
  );
}
