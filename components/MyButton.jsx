import { Colors } from "@/constants/Colors";
import { Text, useColorScheme } from "react-native";
import { Button } from "react-native-paper";

export default function MyButton({
  isSelected = false,
  title,
  titleStyle,
  styles,
  ...props
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <Button
      buttonColor={isSelected ? Colors.secondary : Colors.primary}
      textColor={theme.text}
      mode="elevated"
      style={styles}
      {...props}
    >
      <Text style={titleStyle}>{title}</Text>
    </Button>
  );
}
