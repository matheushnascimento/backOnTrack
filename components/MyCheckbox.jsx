// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Checkbox } from "expo-checkbox";
import MyView from "./MyView";

import { Colors } from "@/constants/Colors";
import { Text } from "react-native";

export default function MyCheckbox({ label, onValueChange, value }) {
  return (
    <MyView safe={false} className="flex-row items-center gap-1.5">
      <Checkbox
        color={value ? Colors.primary : "gray"}
        value={value}
        onValueChange={onValueChange}
      />
      <Text className="font-bold text-base text-light-text dark:text-dark-text">
        {label}
      </Text>
    </MyView>
  );
}
