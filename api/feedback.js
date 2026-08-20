// @ts-nocheck -- handler serverless (req/res do Vercel não tipados); ADR-002
// Função serverless (Vercel) que cria uma issue de feedback no GitHub em nome do
// tester, então quem não tem conta ou familiaridade com o GitHub reporta direto
// do app. O PAT fica SÓ aqui (env GITHUB_ISSUE_TOKEN), nunca no cliente.
//
// Env necessárias na Vercel:
//   GITHUB_ISSUE_TOKEN  PAT fine-grained com issues:write no repo (obrigatório)
//   FEEDBACK_KEY        segredo compartilhado; o app manda em x-feedback-key.
//                       Se não definido, o endpoint não exige o header (abre depois).
//   GITHUB_REPO         opcional; default matheushnascimento/backOnTrack

const DEFAULT_REPO = "matheushnascimento/backOnTrack";
const LABEL = "tester-feedback";
const MAX_TITLE = 140;
const MAX_BODY = 5000;

export default async function handler(req, res) {
  // CORS liberado: o web export roda na mesma origem e o app nativo nem usa
  // CORS, mas isso deixa robusto pra testar via navegador.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-feedback-key");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "method_not_allowed" });

  const key = process.env.FEEDBACK_KEY;
  if (key && req.headers["x-feedback-key"] !== key)
    return res.status(401).json({ error: "unauthorized" });

  const token = process.env.GITHUB_ISSUE_TOKEN;
  if (!token) return res.status(500).json({ error: "server_misconfigured" });

  const repo = process.env.GITHUB_REPO || DEFAULT_REPO;

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  payload = payload || {};

  const rawTitle = String(payload.title ?? "").trim();
  const rawBody = String(payload.body ?? "").trim();
  if (!rawTitle && !rawBody)
    return res.status(400).json({ error: "empty_feedback" });

  const category = String(payload.category ?? "").trim();
  const appVersion = String(payload.appVersion ?? "").trim();
  const environment = String(payload.environment ?? "").trim();
  const userAgent = String(payload.userAgent ?? "").trim();
  const bundle = String(payload.bundle ?? "").trim();
  // Legado: bundles anteriores ao #116 mandam `device` ("android 36"). Enquanto
  // o OTA não alcança todos os testers, os dois formatos convivem.
  const device = String(payload.device ?? "").trim();

  const title = (
    (category ? `[${category}] ` : "") + (rawTitle || rawBody.slice(0, 60))
  ).slice(0, MAX_TITLE);

  const bodyLines = [
    rawBody || "(sem descrição)",
    "",
    "---",
    "_Enviado pela tela de feedback do app._",
  ];
  if (category) bodyLines.push(`- Categoria: ${category}`);
  if (environment) bodyLines.push(`- Ambiente: ${environment}`);
  else if (device) bodyLines.push(`- Dispositivo: ${device}`);
  if (appVersion) bodyLines.push(`- Versão do app: ${appVersion}`);
  if (bundle) bodyLines.push(`- Bundle: ${bundle}`);
  if (userAgent) bodyLines.push(`- User agent: ${userAgent}`);
  const body = bodyLines.join("\n").slice(0, MAX_BODY);

  const gh = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "backOnTrack-feedback",
    },
    body: JSON.stringify({ title, body, labels: [LABEL] }),
  });

  if (!gh.ok) {
    const detail = await gh.text();
    console.error("GitHub issue create failed", gh.status, detail);
    return res.status(502).json({ error: "github_error", status: gh.status });
  }

  const issue = await gh.json();
  return res.status(201).json({ url: issue.html_url, number: issue.number });
}
