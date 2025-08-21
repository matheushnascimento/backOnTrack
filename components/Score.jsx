import MyButton from "./MyButton";
import MyView from "./MyView";

export default function Score() {
  const scoreRange = 5;
  return (
    <MyView
      className="h-fit justify-start items-center flex-row gap-[.6rem]"
      style={{ padding: 6 }}
    >
      {Array.from({ length: scoreRange }).map((_, index) => (
        <MyButton key={index} title={index} className="w-6 h-6 rounded-full" />
      ))}
    </MyView>
  );
}
