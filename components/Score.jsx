// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { StyleSheet, useColorScheme } from "react-native";
import MyButton from "./MyButton";
import MyView from "./MyView";
import { Colors, shadow } from "@/constants/Colors";

export default function Score({ onPress, value, ...props }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const scoreRange = 5;

  const styles = StyleSheet.create({
    container: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      padding: 6,
    },
    button: {
      justifyContent: "center",
      width: 24,
      height: 24,
      borderRadius: 100,
    },
    text: {
      fontWeight: "bold",
      fontSize: 16,
      color: theme.text,
    },
  });
  return (
    <MyView
      className="flex justify-start items-center flex-row gap-2.5"
      style={styles.container}
    >
      {Array.from({ length: scoreRange + 1 }).map((_, index) => (
        <MyButton
          key={index}
          title={index}
          value={value}
          compact="true"
          style={[styles.button, shadow]}
          titleStyle={styles.title}
          {...props}
          onPress={() => onPress(index)}
          isSelected={value === index}
        />
      ))}
    </MyView>
  );
}
