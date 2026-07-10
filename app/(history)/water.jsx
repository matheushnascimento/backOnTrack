// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
// Stub de histórico. A tela de histórico navegável por data será
// construída no M3; por ora apenas lista os registros de água.
import { ScrollView } from "react-native";

import MyView from "@/components/MyView";
import MyHistory from "@/components/MyHistory";

export default function WaterHistory() {
  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <ScrollView
        contentContainerStyle={{ alignItems: "center", padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <MyHistory tableName="water" reload={0} />
      </ScrollView>
    </MyView>
  );
}
