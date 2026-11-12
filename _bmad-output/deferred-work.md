- source_plan: `_bmad-output/plan-gh-429-export-data.md`
  summary: Conferir o download da exportação no PWA instalado do iPhone e, se falhar, usar `navigator.share({files})` onde existir.
  evidence: `<a download>` com blob em modo standalone do iOS é conhecido por abrir visualizador sem volta ou não fazer nada; só um iPhone com o PWA decide.
- source_plan: `_bmad-output/plan-gh-429-export-data.md`
  summary: Reconciliar a regra de identificador exportado em inglês do `CONTRIBUTING.md` com a prática dos módulos recentes, que exportam em português.
  evidence: `constants/dataExport.js`, `constants/bodyWeight.js` e `constants/medPlan.js` exportam nomes em português; o `CONTRIBUTING.md` pede inglês pra código novo.
- source_plan: `_bmad-output/plan-gh-429-export-data.md`
  summary: Na issue da importação, incluir o estado da jornada (`journeyGranted`, `journeyGraduatedAt`, `journeyPeakLevel`, `journeyAckLevel`) no JSON.
  evidence: São valores que a derivação sozinha esquece (#295, #297); restaurar sem eles perde graduações e datas de "estável desde".
- source_plan: `_bmad-output/plan-gh-429-export-data.md`
  summary: Confirmar no build EAS da APK 1.5.0 de staging que a subida do `@expo/config-plugins` (57.0.6 → 57.0.12) não quebrou o prebuild.
  evidence: O `expo install` do `expo-sharing` puxou ferramentas transitivas que só rodam no prebuild.
