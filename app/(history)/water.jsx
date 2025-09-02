//#region imports
import { usePathname } from "expo-router";

import MyHistory, { MyMonthHistory } from "@/components/MyHistory";
import MyView from "@/components/MyView";

import { useThemedStyles } from "@/hook/useThemedStyle";
import MyHeader, { MyMonthHeader } from "@/components/MyHeader";
import { useEffect, useState } from "react";

//#endregion

export default function WaterHistory() {
  //#region variables
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const pathname = usePathname().substring(1);

  const styles = useThemedStyles((theme) => ({
    container: {
      width: "100%",
      overflowY: "scroll",
      flex: 1,
      alignItems: "center",
      paddingTop: "1rem",
      gap: "1rem",
      backgroundColor: "white",
    },
    title: {
      width: "fit",
      display: "flex",
      flexDirection: "row",
      gap: ".4rem",
      color: theme.outerText,
      fontWeight: "bold",
      fontSize: 18,
    },
    card: {
      backgroundColor: theme.background,
    },
  }));
  //#endregion

  return (
    <MyView style={styles.container}>
      <MyMonthHeader onMonthSelect={setSelectedMonth} />
      <MyMonthHistory
        cardStyle={styles.card}
        tableName={pathname}
        month={selectedMonth}
      />
    </MyView>
  );
}
