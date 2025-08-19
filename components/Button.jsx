import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { Button } from "react-native-paper";

export default function MyButton({ title, isSelected = false, ...props }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <Button
      buttonColor={isSelected ? Colors.secondary : Colors.primary}
      textColor={theme.text}
      mode="elevated"
      {...props}
    >
      {title}
    </Button>
  );
}
