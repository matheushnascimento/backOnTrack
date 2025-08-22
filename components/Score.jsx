import { StyleSheet, useColorScheme } from "react-native";
import MyButton from "./MyButton";
import MyView from "./MyView";
import { Colors } from "@/constants/Colors";

export default function Score({ onPress, value, ...props }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? theme.light;
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
      boxShadow: Colors.shadow,
    },
    text: {
      fontWeight: "bold",
      fontSize: "1.6rem",
      color: theme.text,
    },
  });
  return (
    <MyView
      className="flex h-fit justify-start items-center flex-row gap-[.6rem]"
      style={styles.container}
    >
      {Array.from({ length: scoreRange + 1 }).map((_, index) => (
        <MyButton
          key={index}
          title={index}
          value={value}
          compact="true"
          style={styles.button}
          titleStyle={styles.title}
          {...props}
          onPress={() => onPress(index)}
          isSelected={value === index}
        />
      ))}
    </MyView>
  );
}
