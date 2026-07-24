// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Colors, shadow } from "@/constants/Colors";
import { useColorScheme } from "nativewind";
import { Pressable, Text } from "react-native";

export default function MyButton({
  isSelected = false,
  disabled = false,
  title,
  Icon,
  titleClassName,
  className,
  style,
  ...props
}) {
  return (
    <Pressable
      className={`flex-row items-center justify-center rounded-full px-4 py-2 ${
        isSelected ? "bg-secondary" : "bg-primary"
      } ${disabled ? "opacity-40" : ""} ${className ?? ""}`}
      style={[shadow, style]}
      android_ripple={{ color: "#00000022" }}
      disabled={disabled}
      {...props}
    >
      {title != null && (
        <Text
          className={`font-bold text-light-outerText dark:text-dark-text ${
            titleClassName ?? ""
          }`}
        >
          {title}
        </Text>
      )}
      {Icon && <Icon size={24} color="#333" />}
    </Pressable>
  );
}

export function MyIconButton({
  Icon,
  isSelected = false,
  disabled = false,
  className,
  style,
  ...props
}) {
  const { colorScheme } = useColorScheme();
  const themeText =
    colorScheme === "dark" ? Colors.dark.text : Colors.light.text;

  return (
    <Pressable
      className={`items-center justify-center overflow-hidden rounded-full p-[3px] ${
        isSelected
          ? "border-0 bg-secondary"
          : "border border-[#333] bg-transparent dark:border-[#888]"
      } ${disabled ? "opacity-40" : ""} ${className ?? ""}`}
      style={[shadow, style]}
      android_ripple={{ color: "#00000022" }}
      disabled={disabled}
      {...props}
    >
      {Icon && (
        <Icon size={40} color={isSelected ? Colors.primary : themeText} />
      )}
    </Pressable>
  );
}
