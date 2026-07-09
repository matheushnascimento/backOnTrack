// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Text, TextInput } from "react-native";
import MyView from "./MyView";

export default function MyInput({
  label,
  placeholder = "--",
  value,
  onChangeText,
  className,
  style,
  ...props
}) {
  return (
    <MyView safe={false} className="gap-1.5 self-start">
      {label != null && (
        <Text className="font-bold text-base text-light-text dark:text-dark-text">
          {label}
        </Text>
      )}
      <TextInput
        className={`rounded border border-[#333] px-2 py-1 text-light-text dark:text-dark-text ${
          className ?? ""
        }`}
        style={style}
        placeholder={placeholder}
        placeholderTextColor="#888"
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </MyView>
  );
}
