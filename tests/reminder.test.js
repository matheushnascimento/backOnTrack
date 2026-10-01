// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Regra do lembrete do hábito em foco (#364). É a parte testável sem tocar em
// `expo-notifications`, que é módulo nativo.
//
// O que mora aqui é o que impede o lembrete de virar cobrança: não sair
// depois de a pessoa já ter registrado, não sair pra quem não tem hábito em
// foco, e nunca cair no passado, que faria a notificação disparar na hora.

import { nextReminderAt, reminderText } from "@/constants/reminder";

// Base fixa, passada explicitamente, pelo mesmo motivo do habit-signals: sem
// isso o teste depende da hora em que a suíte roda.
const em = (dia, h, m = 0) => new Date(2026, 9, dia, h, m, 0, 0).getTime();
const AGORA = em(1, 14, 0); // 01/10/2026, 14:00

const base = { enabled: true, hhmm: "21:00", focus: "water", now: AGORA };
const quando = (args) => new Date(nextReminderAt({ ...base, ...args }));

describe("nextReminderAt", () => {
  it("agenda hoje quando o horário ainda não passou", () => {
    const d = quando({});
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(21);
    expect(d.getMinutes()).toBe(0);
  });

  it("empurra pra amanhã quando o horário de hoje já passou", () => {
    const d = quando({ hhmm: "09:00" });
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(9);
  });

  it("empurra pra amanhã quando já registrou hoje", () => {
    // O ponto do recurso: quem já fez não é cobrado de novo.
    const d = quando({ registeredToday: true });
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(21);
  });

  it("não agenda nada com o lembrete desligado", () => {
    expect(nextReminderAt({ ...base, enabled: false })).toBeNull();
  });

  it("não agenda nada sem hábito em foco", () => {
    // Quem graduou tudo, ou ainda não entrou na jornada, não tem o que ser
    // lembrado. Lembrar de "alguma coisa" seria cobrança sem objeto.
    expect(nextReminderAt({ ...base, focus: null })).toBeNull();
    expect(nextReminderAt({ ...base, focus: "" })).toBeNull();
    expect(nextReminderAt({ ...base, focus: undefined })).toBeNull();
  });

  it("não agenda nada com horário inválido", () => {
    for (const ruim of ["", "abacaxi", "25:00", "21:99", "9h", null, 2100]) {
      expect(nextReminderAt({ ...base, hhmm: ruim })).toBeNull();
    }
  });

  it("nunca devolve instante no passado", () => {
    // Agendar no passado faria a notificação sair imediatamente, que é o
    // oposto do que a pessoa configurou.
    for (const hhmm of ["00:00", "13:59", "14:00", "14:01", "23:59"]) {
      for (const registeredToday of [false, true]) {
        const t = nextReminderAt({ ...base, hhmm, registeredToday });
        expect(t).toBeGreaterThan(AGORA);
      }
    }
  });

  it("o horário exato de agora conta como passado, e vai pra amanhã", () => {
    // Empate cai pra amanhã de propósito: disparar "agora" é indistinguível
    // de atraso, e surpreende.
    const d = quando({ hhmm: "14:00" });
    expect(d.getDate()).toBe(2);
  });

  it("atravessa a virada do mês sem quebrar", () => {
    const d = new Date(
      nextReminderAt({ ...base, hhmm: "09:00", now: em(31, 23, 0) }),
    );
    expect(d.getMonth()).toBe(10); // novembro
    expect(d.getDate()).toBe(1);
  });

  it("sem argumento nenhum não explode", () => {
    expect(nextReminderAt()).toBeNull();
  });
});

describe("reminderText", () => {
  it("usa o nome da métrica e convida, sem cobrar", () => {
    const { title, body } = reminderText("water", {
      water: { displayName: "água" },
    });
    expect(title).toBe("Back on Track");
    expect(body).toBe("Um minuto pra registrar água?");
  });

  it("cai no nome cru quando a métrica não está no mapa", () => {
    expect(reminderText("water").body).toContain("water");
  });

  it("não usa vocabulário de cobrança", () => {
    // Trava o tom do §1.5: reconhecimento é pros momentos de nível, e
    // lembrete não é momento. "Esqueceu", "perca", "falhou" e exclamação
    // transformariam o convite em cobrança.
    const { body } = reminderText("sleep", { sleep: { displayName: "sono" } });
    expect(body).not.toMatch(/esquec|perc|falh|!|ofensiva|dias seguidos/i);
  });
});
