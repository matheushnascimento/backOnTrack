import { Colors } from "@/constants/Colors";
import { useState } from "react";
import { Text, useColorScheme } from "react-native";
import { Button } from "react-native-paper";

export default function MyButton({
  isSelected = false,
  title,
  Icon,
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
      {title && <Text style={titleStyle}>{title}</Text>}
      {Icon && <Icon size={24} color="#333" />}{" "}
    </Button>
  );
}
export function MyIconButton({
  Icon,
  isSelected = false,
  titleStyle,
  styles,
  ...props
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <Button
      style={{
        border: isSelected ? "none" : "solid 1px #333",
        borderRadius: "100%",
        padding: 3,
        boxShadow: Colors.shadow,
        overflow: "hidden",
      }}
      buttonColor={isSelected ? Colors.secondary : "transparent"}
      textColor={theme.text}
      mode="outlined"
      {...props}
    >
      {Icon && (
        <Icon size={40} color={isSelected ? Colors.primary : theme.text} />
      )}
    </Button>
  );
}
