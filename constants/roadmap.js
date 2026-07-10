// Parser da estrutura do docs/04-roadmap-milestones.md para a Home ("nota
// de atualização"). O roadmap é a fonte única; aqui só extraímos milestones
// e itens (✅/🟡/⬜) e limpamos o jargão dev para exibir. É tolerante: linhas
// fora do padrão são ignoradas, nunca quebra a tela.

/**
 * @typedef {"done" | "partial" | "todo"} Status
 * @typedef {{ status: Status, text: string }} RoadmapItem
 * @typedef {{ id: string, title: string, status: Status, items: RoadmapItem[] }} Milestone
 * @typedef {{ id: string, title: string, headerStatus: Status | null, items: RoadmapItem[] }} RawMilestone
 */

/** @type {Record<string, Status>} */
const STATUS = { "✅": "done", "🟡": "partial", "⬜": "todo" };

const MILESTONE_RE = /^##\s+(M\d+)\b[:\s—–-]*(.*)$/;
const ITEM_RE = /^\s*-\s+(✅|🟡|⬜)\s+(.*)$/;

/**
 * Remove markdown e refs técnicas, mantendo só a "manchete" do item.
 * @param {string} raw
 * @returns {string}
 */
export function cleanText(raw) {
  let s = String(raw ?? "");
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"); // [label](url) -> label
  s = s.replace(/`([^`]+)`/g, "$1"); // `code` -> code
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1"); // **bold** -> bold
  s = s.replace(/\([^)]*\)/g, ""); // remove parênteses (refs/detalhes)
  s = s.replace(/\s#\d+/g, ""); // refs #63 soltas
  // manchete: corta no primeiro ":", em dash, ou fim da 1ª frase
  const cut = s.search(/:\s|\s[—–]\s|\.\s|\.$/);
  if (cut > 15) s = s.slice(0, cut);
  s = s.replace(/\s+([,.;:])/g, "$1"); // " ," -> ","
  s = s
    .replace(/\s{2,}/g, " ")
    .replace(/[\s.,;:—–-]+$/, "")
    .trim();
  return s;
}

/**
 * @param {string} headerRest
 * @returns {Status | null}
 */
function titleStatus(headerRest) {
  for (const emoji of Object.keys(STATUS)) {
    if (headerRest.includes(emoji)) return STATUS[emoji];
  }
  if (/conclu[ií]d/i.test(headerRest)) return "done";
  if (/andamento/i.test(headerRest)) return "partial";
  return null;
}

/**
 * @param {string} headerRest
 * @returns {string}
 */
function cleanTitle(headerRest) {
  return headerRest
    .replace(/[✅🟡⬜]/gu, "")
    .replace(/\b(conclu[ií]do|em andamento)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * @param {RoadmapItem[]} items
 * @returns {Status}
 */
function inferStatus(items) {
  if (items.length === 0) return "todo";
  if (items.every((i) => i.status === "done")) return "done";
  if (items.every((i) => i.status === "todo")) return "todo";
  return "partial";
}

/**
 * @param {string} md
 * @returns {Milestone[]}
 */
export function parseRoadmap(md) {
  /** @type {RawMilestone[]} */
  const milestones = [];
  /** @type {RawMilestone | null} */
  let current = null;

  for (const line of String(md ?? "").split("\n")) {
    const m = line.match(MILESTONE_RE);
    if (m) {
      current = {
        id: m[1],
        title: cleanTitle(m[2]),
        headerStatus: titleStatus(m[2]),
        items: [],
      };
      milestones.push(current);
      continue;
    }
    if (!current) continue;
    const it = line.match(ITEM_RE);
    if (it) {
      const text = cleanText(it[2]);
      if (text) current.items.push({ status: STATUS[it[1]], text });
    }
  }

  return milestones.map(({ headerStatus, ...ms }) => ({
    ...ms,
    status: headerStatus ?? inferStatus(ms.items),
  }));
}

/**
 * Seleciona o resumo para a Home a partir das milestones parseadas.
 * @param {Milestone[]} milestones
 */
export function getDigest(milestones) {
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === "done").length;

  const currentIndex = (() => {
    const partial = milestones.findIndex((m) => m.status === "partial");
    if (partial !== -1) return partial;
    const todo = milestones.findIndex((m) => m.status === "todo");
    return todo !== -1 ? todo : Math.max(0, milestones.length - 1);
  })();

  const current = milestones[currentIndex] ?? null;
  const currentItems = current?.items ?? [];
  const currentDone = currentItems.filter((i) => i.status === "done").length;

  // "Concluído recentemente": os ✅ da milestone atual; se poucos, completa
  // com os da milestone anterior.
  let recentDone = currentItems.filter((i) => i.status === "done");
  if (recentDone.length < 3 && currentIndex > 0) {
    const prev = milestones[currentIndex - 1]?.items ?? [];
    recentDone = [...prev.filter((i) => i.status === "done"), ...recentDone];
  }
  recentDone = recentDone.slice(-4);

  return {
    milestonesDone: done,
    milestonesTotal: total,
    current,
    currentProgress: { done: currentDone, total: currentItems.length },
    recentDone,
  };
}
