// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Lembretes no navegador (#417): a mesma conta de QUANDO do celular, mandada
// pro server por tipo em vez de agendada no aparelho.
//
// O `webPush` é trocado por um falso: o que importa aqui é O QUE vai pro
// server, e não o transporte.

import { Platform } from "react-native";

import { medReminderText } from "@/constants/medPlan";
import {
  rescheduleFocusReminder,
  rescheduleMedReminder,
  rescheduleSleepReminder,
} from "@/infra/reminders";
import { enviarAgenda } from "@/infra/webPush";

// A cadeia de imports passa pelo Supabase (AsyncStorage) e pelo módulo
// nativo de notificação, que no navegador nem é usado.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-notifications", () => ({}));
jest.mock("@/infra/webPush", () => ({
  enviarAgenda: jest.fn(async () => []),
  pedirPermissao: jest.fn(async () => true),
  permissaoConcedida: jest.fn(() => true),
  pushSuportado: jest.fn(() => true),
  precisaInstalar: jest.fn(() => false),
  esquecerAparelho: jest.fn(async () => {}),
}));

const SO_ORIGINAL = Platform.OS;
const AGORA = new Date(2026, 10, 6, 8, 0).getTime();

beforeAll(() => {
  Platform.OS = "web";
  jest.useFakeTimers({ now: AGORA });
});
afterAll(() => {
  Platform.OS = SO_ORIGINAL;
  jest.useRealTimers();
});
beforeEach(() => enviarAgenda.mockClear());

describe("no navegador, a agenda vai pro server", () => {
  it("foco: os próximos dias, com o texto do hábito", async () => {
    const datas = await rescheduleFocusReminder({
      enabled: true,
      hhmm: "20:00",
      focus: "water",
      registeredToday: false,
    });
    expect(datas.length).toBeGreaterThan(0);
    expect(enviarAgenda).toHaveBeenCalledTimes(1);
    const [tipo, avisos] = enviarAgenda.mock.calls[0];
    expect(tipo).toBe("foco");
    expect(avisos.map((a) => a.at)).toEqual(datas);
    expect(avisos[0].body).toMatch(/registrar/);
  });

  it("foco desligado manda lista vazia: é assim que o aviso some", async () => {
    await rescheduleFocusReminder({
      enabled: false,
      hhmm: "20:00",
      focus: "water",
      registeredToday: false,
    });
    expect(enviarAgenda).toHaveBeenCalledWith("foco", []);
  });

  it("sono sem noites suficientes também cala o tipo", async () => {
    await rescheduleSleepReminder({ records: [], enabled: true });
    expect(enviarAgenda).toHaveBeenCalledWith("sono", []);
  });

  it("remédio: um aviso por horário, sem o nome do remédio", async () => {
    await rescheduleMedReminder({
      remedios: [
        {
          id: "r1",
          estado: "aberto",
          nome: "Sertralina",
          horarios: ["09:00", "21:00"],
        },
      ],
      marcas: [],
      enabled: true,
    });
    const [tipo, avisos] = enviarAgenda.mock.calls[0];
    expect(tipo).toBe("remedio");
    expect(avisos.length).toBeGreaterThan(0);
    for (const a of avisos) {
      expect(a).toEqual({ at: a.at, ...medReminderText() });
      expect(JSON.stringify(a)).not.toMatch(/Sertralina/);
    }
  });
});
