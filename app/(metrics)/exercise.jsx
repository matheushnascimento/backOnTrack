// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useLocalSearchParams, usePathname } from "expo-router";

import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import MyButton from "@/components/MyButton";
import MyCheckbox from "@/components/MyCheckbox";
import { MyExerciseHistory } from "@/components/MyHistory";
import MyView from "@/components/MyView";
import Score from "@/components/Score";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";
import { hhmmToMinutes, minutesToHHMM } from "@/constants/duration";

import { add, getById, update } from "@/infra/database";
//#endregion

export default function Exercise() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName, unit } = getCategoryInfo(pathname) ?? {};
  const { id } = useLocalSearchParams();

  //#region states
  const [cardio, setCardio] = useState(false);
  const [date] = useState(getDate());
  const [score, setScore] = useState();
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [training, setTraining] = useState(false);
  const [trainingTimeHour, setTrainingTimeHour] = useState("");
  const [trainingTimeMinute, setTrainingTimeMinute] = useState("");
  const [trainingDurationHour, setTrainingDurationHour] = useState("");
  const [trainingDurationMinute, setTrainingDurationMinute] = useState("");
  const [visible, setVisible] = useState(false);
  //#endregion

  //#region edição
  useEffect(() => {
    if (!id) return;
    const r = getById(id);
    if (!r) return;
    const [dh, dm] = minutesToHHMM(r.quantity).split(":");
    setTrainingDurationHour(dh);
    setTrainingDurationMinute(dm);
    const [th, tm] = String(r.trainingTime ?? ":").split(":");
    setTrainingTimeHour(th ?? "");
    setTrainingTimeMinute(tm ?? "");
    setTraining(!!r.training);
    setCardio(!!r.cardio);
    setObservation(r.note ?? r.observation ?? "");
    setScore(r.score);
  }, [id]);
  //#endregion

  //#region functions
  function handleSubmit() {
    setVisible(true);
    const data = {
      date: date.ISOdate,
      quantity: hhmmToMinutes(
        `${trainingDurationHour}:${trainingDurationMinute}`,
      ),
      unit,
      note: observation,
      training,
      cardio,
      trainingTime: `${trainingTimeHour}:${trainingTimeMinute}`,
      score,
    };
    if (id) update(id, data);
    else add("exercise", data);
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
          className="max-w-[640px] gap-8 rounded-lg bg-light-backgroundCard p-2.5 dark:bg-dark-backgroundCard"
        >
          <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
            {date.displayDate} {displayName}
          </Text>

          {/* card Wrapper */}
          <MyView safe={false} className="gap-4">
            <MyCheckbox
              value={training}
              label="Treino"
              onValueChange={() => setTraining(!training)}
            />
            <MyCheckbox
              value={cardio}
              label="Cardio"
              onValueChange={() => setCardio(!cardio)}
            />
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
              placeholder="Observações sobre o exercício..."
            />
          </MyView>

          <MyView
            safe={false}
            className="flex-row flex-wrap items-center gap-4"
          >
            {/* Hora do exercício */}
            <MyView
              safe={false}
              className="items-center gap-8 rounded-lg bg-light-backgroundCard p-2.5 dark:bg-dark-backgroundCard"
            >
              <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
                Hora do treino
              </Text>
              <MyView
                safe={false}
                className="flex-row items-center justify-center gap-1"
              >
                <TextInput
                  className="h-[51px] w-20 max-w-[160px] rounded-lg bg-dark-background p-1.5 text-center text-[26px] font-bold text-white"
                  placeholder="--"
                  value={trainingTimeHour}
                  onChangeText={(value) => setTrainingTimeHour(value)}
                />
                <Text className="font-bold text-lg text-light-text dark:text-dark-text">
                  :
                </Text>
                <TextInput
                  className="h-[51px] w-20 max-w-[160px] rounded-lg bg-dark-background p-1.5 text-center text-[26px] font-bold text-white"
                  placeholder="--"
                  value={trainingTimeMinute}
                  onChangeText={(value) => setTrainingTimeMinute(value)}
                />
              </MyView>
            </MyView>
            {/* Tempo de treino */}
            <MyView
              safe={false}
              className="items-center gap-8 rounded-lg bg-light-backgroundCard p-2.5 dark:bg-dark-backgroundCard"
            >
              <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
                Tempo de treino
              </Text>
              <MyView safe={false} className="flex-row items-end gap-1">
                <TextInput
                  className="h-[51px] w-20 max-w-[160px] rounded-lg bg-dark-background p-1.5 text-center text-[26px] font-bold text-white"
                  placeholder="--"
                  value={trainingDurationHour}
                  onChangeText={(value) => setTrainingDurationHour(value)}
                />
                <Text className="font-bold text-lg text-light-text dark:text-dark-text">
                  h
                </Text>
                <TextInput
                  className="h-[51px] w-20 max-w-[160px] rounded-lg bg-dark-background p-1.5 text-center text-[26px] font-bold text-white"
                  placeholder="--"
                  value={trainingDurationMinute}
                  onChangeText={(value) => setTrainingDurationMinute(value)}
                />
                <Text className="font-bold text-lg text-light-text dark:text-dark-text">
                  min
                </Text>
              </MyView>
            </MyView>
          </MyView>
          <MyButton title="Salvar" onPress={() => handleSubmit()} />
        </MyView>
        <MyExerciseHistory tableName={pathname} reload={reloadKey} />
      </ScrollView>
    </MyView>
  );
}
