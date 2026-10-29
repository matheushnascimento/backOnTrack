// @ts-nocheck -- helper puro; tipos vêm quando toda a constants/ for tipada (ADR-002)

/**
 * Preferências que pertencem ao APARELHO, e não à conta.
 *
 * O store principal é um MergeableStore inteiro no synchronizer, `values`
 * incluídos. Tudo que mora nele viaja pra sala da conta e de lá pra todo
 * aparelho logado. Pra registro é exatamente o que se quer. Pra estas chaves é
 * um defeito:
 *
 * - **lembretes**: ligar no celular ligaria no tablet, que nunca pediu
 *   permissão de notificação nem foi configurado. Permissão é do aparelho.
 * - **prévias de dev**: ligar o modo demo no navegador de desenvolvimento
 *   ligaria a jornada falsa no celular de uso real.
 *
 * O tema já tinha resolvido isso pra ele com AsyncStorage (`infra/theme.js`).
 * Aqui é um segundo store do TinyBase, persistido mas fora do synchronizer,
 * porque Ajustes e os hooks de lembrete dependem da reatividade do `useValue`,
 * que o AsyncStorage não tem.
 *
 * ## Por que o `syncRoomId` não está na lista
 *
 * É o identificador da sala anônima, e também é do aparelho. Mas tirá-lo do
 * store sincronizado faria os aparelhos no 1.2.0 regenerarem o ID a cada
 * abertura e devolvê-lo ao servidor, num vai e volta sem fim. E o ganho seria
 * nulo: desde 04/09 a sala anônima leva 401, então o ID não sincroniza nada.
 */

/** Chaves que moram no store local, com tipo e padrão. */
export const LOCAL_PREFS_SCHEMA = {
  // Lembrete diário do hábito em foco (#364). Desligado por padrão: o app
  // não notifica ninguém sem a pessoa pedir.
  reminderEnabled: { type: "boolean", default: false },
  // Horário do lembrete, "HH:MM".
  reminderTime: { type: "string", default: "21:00" },
  // Lembrete do sono que aprende o horário (#368). Desligado por padrão.
  sleepReminderEnabled: { type: "boolean", default: false },
  // Aviso no horário de cada remédio do plano (#392). Desligado por padrão.
  medReminderEnabled: { type: "boolean", default: false },
  // Nível forçado pra previsualizar telas (#293). -1 = desligado.
  journeyDemoLevel: { type: "number", default: -1 },
  // Força a tela de retomada, pra previsualização (#320).
  retomadaDemo: { type: "boolean", default: false },
  // Marca de que a migração do store sincronizado já rodou neste aparelho.
  localPrefsMigrated: { type: "boolean", default: false },
  // Timer de exercício ou estudo rodando (#369). Vazio = nenhum. Guarda o
  // INSTANTE de início, e não um contador: o decorrido é sempre agora menos
  // início, e fechar o app não perde nada. Ver `constants/timer.js`.
  timerMetric: { type: "string", default: "" },
  timerStartedAt: { type: "number", default: 0 },
};

/**
 * As chaves que a migração traz do store sincronizado.
 *
 * Lista fechada, e não derivada do schema: são as que existiam no store
 * sincronizado antes da mudança. Chave nova do aparelho nasce aqui no local e
 * não tem o que migrar.
 */
export const LOCAL_PREF_KEYS = [
  "reminderEnabled",
  "reminderTime",
  "sleepReminderEnabled",
  "journeyDemoLevel",
  "retomadaDemo",
];

/**
 * Traz as preferências do store sincronizado pro local, uma vez por aparelho.
 *
 * Roda depois que os DOIS stores carregaram do disco. Antes disso o local
 * mostraria só os padrões, e a cópia sobrescreveria nada com nada.
 *
 * Copia o valor que o aparelho tinha e APAGA do sincronizado. Apagar é o que
 * para a viagem: a remoção sincroniza, e os aparelhos ainda na versão antiga
 * voltam ao padrão (lembrete e demo desligados), que é o comportamento seguro.
 *
 * Idempotente pela marca `localPrefsMigrated`: rodar de novo não faz nada, e
 * um valor que chegue depois pelo sync, vindo de um aparelho antigo, não
 * sobrescreve a escolha local.
 *
 * @param {import("tinybase").MergeableStore} synced store principal
 * @param {import("tinybase").Store} local store do aparelho
 * @returns {string[]} chaves copiadas, pra log e teste
 */
export function migrateLocalPrefs(synced, local) {
  if (local.getValue("localPrefsMigrated")) return [];
  const copiadas = [];
  local.transaction(() => {
    for (const k of LOCAL_PREF_KEYS) {
      if (!synced.hasValue(k)) continue;
      local.setValue(k, synced.getValue(k));
      copiadas.push(k);
    }
    local.setValue("localPrefsMigrated", true);
  });
  synced.transaction(() => {
    for (const k of LOCAL_PREF_KEYS) synced.delValue(k);
  });
  return copiadas;
}
