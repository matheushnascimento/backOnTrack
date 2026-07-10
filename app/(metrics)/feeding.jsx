// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useLocalSearchParams, usePathname } from "expo-router";

import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import MyButton from "@/components/MyButton";
import { MyIconButton } from "@/components/MyButton";
import MyHistory from "@/components/MyHistory";
import MyView from "@/components/MyView";
import Score from "@/components/Score";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";

import { add, getById, update } from "@/infra/database";
//#endregion

export default function Feeding() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName, unit } = getCategoryInfo(pathname) ?? {};
  const { id } = useLocalSearchParams();

  //#region states
  const [date] = useState(getDate());
  const [score, setScore] = useState();
  const [observation, setObservation] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [visible, setVisible] = useState(false);
  //#endregion

  //#region edição
  useEffect(() => {
    if (!id) return;
    const r = getById(id);
    if (!r) return;
    setQuantity(Number(r.quantity) || 0);
    setObservation(r.note ?? r.observation ?? "");
    setScore(r.score);
  }, [id]);
  //#endregion

  //#region functions
  function handleSubmit() {
    setVisible(true);
    const data = {
      date: date.ISOdate,
      quantity: Number(quantity) || 0,
      unit,
      note: observation,
      score,
    };
    if (id) update(id, data);
    else add("feeding", data);
    setReloadKey((prev) => prev + 1);
  }
  function onDismissSnackBar() {
    setVisible(false);
  }
  //#endregion

  return (
    <MyView
      safe={true}
      className="flex-1 items-center gap-4 bg-light-background p-4 dark:bg-dark-background"
    >
      <Snackbar
        visible={visible}
        onDismiss={onDismissSnackBar}
        action={{
          label: "Fechar",
          onPress: onDismissSnackBar,
        }}
      >
        Registro salvo!
      </Snackbar>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{
          alignItems: "center",
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <MyView
          safe={false}
          className="max-w-[640px] gap-8 overflow-hidden rounded-lg bg-light-backgroundCard p-2.5 dark:bg-dark-backgroundCard"
        >
          <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
            {date.displayDate} {displayName}
          </Text>

          {/* card Wrapper */}
          <MyView safe={false} className="gap-4">
            <MyView safe={false} className="flex-row gap-5">
              {Array.from({ length: quantity }).map((_, index) => (
                <MyIconButton
                  key={index}
                  value={index}
                  compact="true"
                  isSelected={true}
                  onPress={() => setQuantity(quantity - 1)}
                />
              ))}
              <MyIconButton
                onPress={() => setQuantity(quantity + 1)}
                compact="true"
              />
            </MyView>
          </MyView>

          {/* Nota */}
          <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
            Nota
          </Text>
          <Score value={score} onPress={setScore} />

          {/* OBS */}
          <MyView safe={false} className="gap-1">
            <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
              OBS:
            </Text>
            <TextInput
              value={observation}
              onChangeText={(value) => setObservation(value)}
              className="h-16 rounded-lg bg-light-backgroundCard p-1.5 text-[19px] font-normal text-light-text dark:bg-dark-backgroundCard dark:text-dark-text"
              placeholder="Observações sobre refeições..."
            />
          </MyView>

          <MyButton title="Salvar" onPress={() => handleSubmit()} />
        </MyView>
        <MyHistory tableName={pathname} reload={reloadKey} />
      </ScrollView>
    </MyView>
  );
}
