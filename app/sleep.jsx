import MyView from "@/components/MyView";
import { useThemedStyles } from "@/hook/useThemedStyle";

export default function Sleep() {
  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    title: {
      color: theme.text,
      fontSize: 18,
    },
  }));
  return <MyView style={styles.container}></MyView>;
}
