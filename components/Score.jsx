// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import MyButton from "./MyButton";
import MyView from "./MyView";
import { shadow } from "@/constants/Colors";

export default function Score({ onPress, value, ...props }) {
  const scoreRange = 5;

  return (
    <MyView className="flex-row flex-wrap items-center justify-start gap-2.5 p-1.5">
      {Array.from({ length: scoreRange + 1 }).map((_, index) => (
        <MyButton
          key={index}
          title={index}
          className="h-6 w-6 justify-center rounded-full"
          style={shadow}
          titleClassName="text-base"
          {...props}
          onPress={() => onPress(index)}
          isSelected={value === index}
        />
      ))}
    </MyView>
  );
}
