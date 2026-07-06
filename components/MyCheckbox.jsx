import { Checkbox } from "expo-checkbox";
import MyView from "./MyView";

import { Colors } from "@/constants/Colors";
import { Text } from "react-native";
import { useThemedStyles } from "@/hook/useThemedStyle";

export default function MyCheckbox({ label, onValueChange, value }) {
  const styles = useThemedStyles((theme) => ({
    container: { flexDirection: "row", alignItems: "center", gap: 6 },
    text: {
      fontWeight: "bold",
      fontSize: 16,
      color: theme.text,
    },
  }));

  return (
    <MyView style={styles.container}>
      <Checkbox
        color={value ? Colors.primary : "gray"}
        value={value}
        onValueChange={onValueChange}
      />
      <Text style={styles.text}>{label}</Text>
    </MyView>
  );
}
