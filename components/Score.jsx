import MyButton from "./MyButton";
import MyView from "./MyView";

export default function Score({ onPress, value, ...props }) {
  const scoreRange = 5;
  return (
    <MyView
      className="h-fit justify-start items-center flex-row gap-[.6rem]"
      style={{ padding: 6 }}
    >
      {Array.from({ length: scoreRange + 1 }).map((_, index) => (
        <MyButton
          key={index}
          title={index}
          value={value}
          className="w-6 h-6 rounded-full"
          {...props}
          onPress={() => onPress(index)}
          isSelected={value === index}
        />
      ))}
    </MyView>
  );
}
