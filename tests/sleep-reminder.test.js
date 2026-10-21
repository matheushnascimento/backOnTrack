// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Lembrete do sono que aprende o horário (#368).
//
// Os registros aqui são LINHAS CRUAS do `useTable`, com `bed` e `wake` presos
// no `details`. É o formato que o lembrete recebe no app, e testar só com o
// registro hidratado foi como o #344 e o #355 ficaram sem efeito em produção
// com a suíte verde (#356).

import {
  FOLGA_MIN,
  MIN_NOITES,
  medianaCircular,
  sleepReminderSchedule,
  sleepReminderStatus,
  sleepReminderText,
  sleepTakesOverFocus,
  typicalSleepTimes,
} from "@/constants/sleepReminder";

const hm = (h, m = 0) => h * 60 + m;
const em = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();

/** Noite que começa no dia `d` de outubro, registrada às 08:00 do seguinte. */
const noite = (d, bed, wake, extra = {}) => ({
  type: "sleep",
  quantity: extra.quantity ?? 0,
  createdAt: extra.createdAt ?? em(d + 1, 8),
  details: JSON.stringify({
    ...(bed ? { bed } : {}),
    ...(wake ? { wake } : {}),
  }),
});

/** Cinco noites, de 10 a 14/10, deitando às 23:00 e acordando às 07:00. */
const semana = () =>
  [10, 11, 12, 13, 14].map((d) => noite(d, "23:00", "07:00"));

const quando = (ms) => {
  const d = new Date(ms);
  return [d.getDate(), d.getHours(), d.getMinutes()];
};

describe("medianaCircular", () => {
  it("atravessa a meia-noite sem tratá-la como extremo", () => {
    // Em "minutos desde a meia-noite" a mediana linear seria 23:30, puxada
    // pelos dois horários depois da meia-noite como se fossem os mais cedo.
    const minutos = [hm(23, 30), hm(23, 40), hm(23, 50), hm(0, 10), hm(0, 20)];
    expect(medianaCircular(minutos)).toBe(hm(23, 50));
  });

  it("uma noite fora da curva não puxa o horário", () => {
    // A média circular andaria quase uma hora por causa das 03:00.
    const minutos = [hm(23), hm(23), hm(23), hm(23), hm(3)];
    expect(medianaCircular(minutos)).toBe(hm(23));
  });

  it("empate não depende da ordem das linhas", () => {
    const a = medianaCircular([hm(22), hm(0)]);
    const b = medianaCircular([hm(0), hm(22)]);
    expect(a).toBe(b);
  });

  it("sem amostra, null", () => {
    expect(medianaCircular([])).toBeNull();
  });
});

describe("typicalSleepTimes", () => {
  const now = em(20, 10);

  it("lê deitar e acordar de dentro do details cru", () => {
    const t = typicalSleepTimes(semana(), now);
    expect(t.bed).toBe(hm(23));
    expect(t.wake).toBe(hm(7));
    expect(t.nBed).toBe(5);
  });

  it(`abaixo de ${MIN_NOITES} noites não há horário típico`, () => {
    const t = typicalSleepTimes(semana().slice(0, 4), now);
    expect(t.bed).toBeNull();
    expect(t.nBed).toBe(4);
  });

  it("acordar é independente: deitar suficiente, acordar não", () => {
    // `wake` é opcional no registro (§4.2), então este é o caso comum.
    const records = [10, 11, 12, 13, 14].map((d, i) =>
      noite(d, "23:00", i < 2 ? "07:00" : undefined),
    );
    const t = typicalSleepTimes(records, now);
    expect(t.bed).toBe(hm(23));
    expect(t.wake).toBeNull();
    expect(t.nWake).toBe(2);
  });

  it("dois registros da mesma noite contam como uma", () => {
    // Quem corrige criando outro registro não pode inflar o mínimo.
    const records = [
      ...semana().slice(0, 4),
      noite(13, "23:30", "07:00", { createdAt: em(14, 9) }),
    ];
    expect(typicalSleepTimes(records, now).nBed).toBe(4);
  });

  it("noite fora da janela de 14 dias não conta", () => {
    const records = [...semana().slice(0, 4), noite(1, "23:00", "07:00")];
    expect(typicalSleepTimes(records, now).bed).toBeNull();
  });

  it("registro de outra métrica não conta", () => {
    const records = semana().map((r) => ({ ...r, type: "exercise" }));
    expect(typicalSleepTimes(records, now).nBed).toBe(0);
  });
});

describe("sleepReminderSchedule", () => {
  const base = { records: semana(), enabled: true, dias: 3 };

  it("desligado não agenda nada", () => {
    expect(
      sleepReminderSchedule({ ...base, enabled: false, now: em(20, 10) }),
    ).toEqual([]);
  });

  it("sem noites suficientes não agenda nada", () => {
    expect(
      sleepReminderSchedule({
        ...base,
        records: semana().slice(0, 4),
        now: em(20, 10),
      }),
    ).toEqual([]);
  });

  it(`deitar sai ${FOLGA_MIN} min ANTES do típico, três noites`, () => {
    const agenda = sleepReminderSchedule({ ...base, now: em(20, 10) });
    const deitar = agenda.filter((a) => a.kind === "bed").map((a) => a.at);
    expect(deitar.map(quando)).toEqual([
      [20, 22, 30],
      [21, 22, 30],
      [22, 22, 30],
    ]);
  });

  it(`acordar sai ${FOLGA_MIN} min DEPOIS do típico, e o de hoje já passou`, () => {
    const agenda = sleepReminderSchedule({ ...base, now: em(20, 10) });
    const acordar = agenda.filter((a) => a.kind === "wake").map((a) => a.at);
    expect(acordar.map(quando)).toEqual([
      [21, 7, 30],
      [22, 7, 30],
      [23, 7, 30],
    ]);
  });

  it("vem em ordem de horário, intercalando os dois", () => {
    const agenda = sleepReminderSchedule({ ...base, now: em(20, 10) });
    expect(agenda.map((a) => a.kind)).toEqual([
      "bed",
      "wake",
      "bed",
      "wake",
      "bed",
      "wake",
    ]);
  });

  it("deitar já registrado hoje cala o lembrete desta noite", () => {
    const records = [
      ...semana(),
      noite(20, "22:10", undefined, { createdAt: em(20, 22, 10) }),
    ];
    const agenda = sleepReminderSchedule({
      ...base,
      records,
      now: em(20, 22, 15),
    });
    const deitar = agenda.filter((a) => a.kind === "bed").map((a) => a.at);
    expect(deitar.map(quando)[0]).toEqual([21, 22, 30]);
    expect(deitar).toHaveLength(3);
  });

  it("duração registrada de manhã cala o acordar daquela noite", () => {
    // Quem registrou só a duração já registrou a noite.
    const records = [
      ...semana(),
      noite(20, undefined, undefined, {
        quantity: 480,
        createdAt: em(21, 7, 10),
      }),
    ];
    const agenda = sleepReminderSchedule({
      ...base,
      records,
      now: em(21, 7, 15),
    });
    const acordar = agenda.filter((a) => a.kind === "wake").map((a) => a.at);
    expect(acordar.map(quando)[0]).toEqual([22, 7, 30]);
  });

  it("quem deita depois da meia-noite recebe o aviso na véspera", () => {
    // Deitar típico 00:20 dá lembrete 23:50 do dia anterior, e essa noite
    // não pode ser confundida com a seguinte.
    const records = [10, 11, 12, 13, 14].map((d) =>
      noite(d, "00:20", "08:00", { createdAt: em(d + 1, 9) }),
    );
    const agenda = sleepReminderSchedule({
      ...base,
      records,
      now: em(20, 10),
    });
    const deitar = agenda.filter((a) => a.kind === "bed").map((a) => a.at);
    expect(deitar.map(quando)[0]).toEqual([20, 23, 50]);
  });

  it("noite de quem deita depois da meia-noite cala o acordar certo", () => {
    // A armadilha: o `nightInstant` já vem deslocado pela fronteira das 18h.
    // Reaplicar a fronteira nele jogaria esta noite um dia pra trás, e o
    // acordar das 08:30 de hoje dispararia mesmo com a noite registrada.
    //
    // Só aparece no acordar: o aviso de deitar dessa noite (23:50) é anterior
    // ao próprio deitar (00:20), então já passou quando o registro existe.
    const records = [
      ...[10, 11, 12, 13, 14].map((d) =>
        noite(d, "00:20", "08:00", { createdAt: em(d + 1, 9) }),
      ),
      noite(20, "00:20", "08:00", { createdAt: em(21, 8, 5) }),
    ];
    const agenda = sleepReminderSchedule({
      ...base,
      records,
      now: em(21, 8, 10),
    });
    const acordar = agenda.filter((a) => a.kind === "wake").map((a) => a.at);
    expect(acordar.map(quando)[0]).toEqual([22, 8, 30]);
  });
});

describe("sleepTakesOverFocus", () => {
  const now = em(20, 10);
  const base = { focus: "sleep", enabled: true, records: semana(), now };

  it("assume quando o foco é o sono, está ligado e tem noites", () => {
    expect(sleepTakesOverFocus(base)).toBe(true);
  });

  it("com o foco em outro hábito, o lembrete do foco segue", () => {
    expect(sleepTakesOverFocus({ ...base, focus: "water" })).toBe(false);
  });

  it("desligado, o lembrete do foco segue", () => {
    expect(sleepTakesOverFocus({ ...base, enabled: false })).toBe(false);
  });

  it("sem noites suficientes, o lembrete do foco segue", () => {
    // Desligar o fixo antes do adaptativo existir deixaria quem está
    // começando sem lembrete nenhum.
    expect(
      sleepTakesOverFocus({ ...base, records: semana().slice(0, 4) }),
    ).toBe(false);
  });
});

describe("sleepReminderText", () => {
  it("nenhum dos dois cobra", () => {
    for (const kind of ["bed", "wake"]) {
      const { body } = sleepReminderText(kind);
      expect(body).not.toMatch(/!|esquec|não perca|precisa/i);
    }
  });
});

describe("sleepReminderStatus", () => {
  const now = em(20, 10);

  it("aprendendo, diz quantas noites faltam", () => {
    const st = sleepReminderStatus(semana().slice(0, 3), now);
    expect(st).toEqual({ faltam: 2, deitar: null, acordar: null });
  });

  it("com noites, mostra os horários dos AVISOS, já com a folga", () => {
    expect(sleepReminderStatus(semana(), now)).toEqual({
      faltam: 0,
      deitar: "22:30",
      acordar: "07:30",
    });
  });

  it("aviso de deitar atravessa a meia-noite pra trás", () => {
    const records = [10, 11, 12, 13, 14].map((d) =>
      noite(d, "00:10", undefined, { createdAt: em(d + 1, 9) }),
    );
    expect(sleepReminderStatus(records, now)).toEqual({
      faltam: 0,
      deitar: "23:40",
      acordar: null,
    });
  });
});
