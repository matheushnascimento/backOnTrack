// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Stack } from "expo-router";

export default function HistoryLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
