# Modelo de Níveis — Back on Track

Documento de desenho, escrito **antes** de qualquer código. Fixa o modelo, o que é decisão fechada, o que ainda está aberto, e em que evidência cada peça se apoia.

**Status:** em revisão. Design do Turno 4 (Claude Design, projeto `4565395c-…`) respondeu o briefing [12-briefing-home-niveis.md](./12-briefing-home-niveis.md) com 6 telas e fechou duas decisões — ver §11. Fechado: cumulativo, regressão em vez de ofensiva, portão por sinal e por comportamento, três regras de quebra (diária binária, diária quantitativa, semanal), graduação, ordem sugerida com skip qualificado. Aberto: ver §11.

Referência declarada: **Fabulous** (habit tracker científico, modelo de jornada). O que se rejeita nele: não engaja, e a premissa lúdica polui. Queremos a jornada, sem a fantasia.

Este documento **não** altera o `04-roadmap-milestones.md`. O roadmap só muda quando o modelo estiver fechado.

---

## 1. A ideia em uma frase

O app deixa de tratar 5 métricas como iguais e passa a conduzir uma **jornada**: um hábito por vez, conquistado até ficar estável, acumulando — e quem quebra o fluxo **volta um nível** em vez de perder tudo.

```
lvl 1   sono
lvl 2   sono + água
lvl 3   sono + água + <próximo>
...
```

**Cumulativo** (decidido): no lvl 2 o sono continua valendo. Não é uma esteira em que o anterior sai de cena.

---

## 2. Por que regressão em vez de ofensiva zerada

A objeção natural é que punir contradiz a voz do app — que fala "sem pressa", "sem cobrança", e reserva `danger` só pro destrutivo (ver `08-design-tokens.md`).

**O argumento se inverte quando se olha a alternativa.** Ofensiva é que é brutal: 45 dias viram zero por uma noite. Perder um nível preserva quase todo o progresso e devolve a pessoa a um hábito que ela **já provou** que consegue — reconquistar é mais fácil que da primeira vez. É decaimento gradual em vez de penhasco.

A evidência é desfavorável à ofensiva pura:

- Ofensiva zerada produz **quit moment, não restart moment** — vergonha e abandono, não motivação renovada.
- O mecanismo tem nome desde os anos 70: **what-the-hell effect** (Polivy & Herman). Depois de um deslize, a pessoa não volta ao plano; abandona de vez, porque o custo de quebrar mais caiu a zero. Mesma família do _abstinence violation effect_ — quem mira perfeição desiste mais depois de um único escorregão.
- O próprio **Duolingo**, que popularizou a ofensiva, recuou: o **Streak Freeze cortou churn em 21%** entre usuários em risco, e o achado deles foi que **facilitar a manutenção aumentou engajamento _e_ resultado de aprendizado**.

A regressão também é coerente com o que o app já faz: o estado de retomada (#242) não cobra quem sumiu por 3 dias, convida. A regressão é esse mesmo gesto, mecanizado.

---

## 3. O portão de nível NÃO é tempo

A proposta inicial era subir de nível após 1–2 semanas sustentadas. **A pesquisa contradiz isso.**

- Lally et al. (UCL, 2010), n=96: mediana de **66 dias** até o comportamento virar automático, faixa de **18 a 254**.
- A literatura converge em **1–2 hábitos novos por vez** como teto — acima disso a tendência é falharem todos, porque na fase ativa cada um ainda consome esforço consciente.

Cruzando com o cumulativo: subir em 2 semanas empilha o segundo hábito enquanto o primeiro ainda está a ~50 dias de ser automático. É exatamente o modo de falha documentado — cumulativo com escada rápida vira castelo de cartas, e a regressão deixa de ser gentil: vira inevitável.

**Portanto o portão é sinal, não calendário.** Sobe de nível quando o hábito anterior dá sinais de estar perto de automático. A faixa de 18 a 254 dias é justamente o argumento contra prazo fixo: as pessoas diferem demais.

---

## 4. O portão é comportamento, nunca desfecho

**Não se habitua um resultado.** Ninguém decide dormir 7h30 — decide-se deitar às 23h30. A duração é consequência de ansiedade, cafeína, barulho, criança acordando.

Das cinco métricas, o sono é a única em que o número registrado **não é um comportamento**:

| métrica     | o que se registra      | é comportamento? |
| ----------- | ---------------------- | ---------------- |
| água        | você bebeu             | ✅ controlável   |
| exercício   | você treinou           | ✅ controlável   |
| alimentação | você comeu             | ✅ controlável   |
| estudo      | você estudou           | ✅ controlável   |
| **sono**    | **quanto você dormiu** | ❌ **desfecho**  |

Se o portão do nível fosse duração de sono, o app rebaixaria alguém por algo fora do seu controle. Isso é pior que ofensiva zerada: é punição por azar.

**Regra:** o portão de nível é sempre um comportamento. No sono, é a consistência do horário de deitar. A duração segue registrada e exibida — é o que importa pra pessoa — mas não decide nível.

Isso reaproveita o sinal de regularidade da §5: `bed` já é o dado, e é comportamento e proxy de automaticidade ao mesmo tempo.

Base: auto-eficácia e o modelo do Fogg convergem em que hábito pega quando a habilidade exigida é mínima e a pessoa acumula experiências de domínio. Gatear por desfecho quebra as duas coisas.

---

## 5. Como medir "perto de automático" com o dado que já temos

Lally mediu automaticidade com questionário (SRHI). Não temos isso, e não queremos: questionário é fricção, e o app inteiro é construído em cima de registro rápido.

O que temos é `records` com `createdAt`, `quantity` e `type`. Dá pra montar um **proxy comportamental** com três sinais:

| sinal            | o que é                              | por que indica automaticidade                                                                                                |
| ---------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **consistência** | % de dias no alvo, janela de 28 dias | o óbvio: o comportamento acontece                                                                                            |
| **regularidade** | dispersão do horário do registro     | comportamento automático é disparado por contexto e acontece em horário estável; variabilidade cai conforme o hábito assenta |
| **resiliência**  | falhou e voltou no dia seguinte?     | hábito automático se recupera sozinho; hábito frágil vira duas faltas                                                        |

**A regularidade é o sinal mais interessante e o menos óbvio** — e é de graça, porque todo registro já tem timestamp. Sono ainda tem `bed`/`wake`, que dá o sinal direto sem depender da hora em que a pessoa abriu o app.

⚠️ **Isto é proxy, não medida.** Não estamos medindo automaticidade; estamos inferindo de comportamento observável. Os limiares abaixo são **ponto de partida pra calibrar com dado real**, não verdades:

- consistência ≥ 80% em 28 dias
- desvio do horário habitual estável ou em queda
- nenhuma falta dupla na janela

O primeiro usuário com dado suficiente pra calibrar é o próprio dono do projeto — há registros desde julho.

---

## 6. O que conta como quebrar: três regras, não uma

As métricas não são todas do mesmo tipo, e tratá-las igual seria erro:

| tipo                    | exemplo                        | pergunta           | regra de quebra                          |
| ----------------------- | ------------------------------ | ------------------ | ---------------------------------------- |
| **binário diário**      | tomar água, registrar refeição | "fez?"             | **duas faltas consecutivas**             |
| **quantitativo diário** | horário de deitar              | "foi suficiente?"  | **média móvel de 7 dias abaixo do alvo** |
| **frequência semanal**  | exercício, estudo              | "manteve o ritmo?" | **duas semanas seguidas abaixo do alvo** |

**Por que duas faltas no binário:** Lally mostra que perder **um** dia custa menos de meio ponto de automaticidade e recupera rápido. A segunda falta consecutiva é onde o laço quebra — "falhar uma vez é acidente, falhar duas é o começo de um hábito novo". Simples de explicar e alinhado com o dado.

**Por que média móvel no quantitativo:** a pergunta não é binária. Uma noite de 5h no meio de uma semana boa não é quebra; sete noites de 6h são. Média móvel perdoa o acidente e pega o padrão.

**Por que semanal em exercício e estudo:** eles não são hábitos diários — costumam ser 3–5×/semana. Aplicar "duas faltas consecutivas" rebaixaria alguém por não treinar sábado e domingo, ou seja, **por descansar**. A unidade certa é a semana, e a lógica é a mesma do binário: uma semana ruim é acidente, duas seguidas são padrão.

A semana é **calendário (seg–dom)**, não janela móvel: é como as pessoas planejam ("essa semana treinei 3×"), é legível na UI, e o app já tem a tela Semana. Janela móvel seria mais contínua e menos compreensível — o nível cairia numa terça sem que nada tivesse mudado naquele dia.

---

## 7. Graduação: hábito maduro para de poder derrubar

Sem isso, cumulativo é insustentável por aritmética. Se cada hábito tem ~90% de chance de se sustentar numa semana, cinco hábitos juntos têm 0,9⁵ ≈ **59%**; sete, **48%**. A partir de certo nível a pessoa quebraria alguma coisa quase toda semana e oscilaria pra sempre.

A saída não é afrouxar a regra: é reconhecer que **hábito automático não disputa o mesmo recurso.** Escovar os dentes não exige força de vontade. O argumento de esgotamento vale pra fase de formação ativa, não depois.

**Regra:** o hábito **gradua** quando os três sinais da §5 se sustentam numa barra mais alta. Continua sendo acompanhado e exibido, mas deixa de poder causar regressão. Só hábitos **não graduados** entram no cálculo de quebra.

### Por que graduação é sinal, e não "N semanas"

A primeira versão deste documento definia graduação como "N semanas além do portão". **Isso contradizia a §3.**

A §3 estabelece que o portão de nível é sinal e não calendário, justamente porque a faixa de automaticidade vai de 18 a 254 dias e prazo fixo seria arbitrário. Definir graduação por semanas fixas reintroduz exatamente o calendário que acabamos de rejeitar — se prazo fixo é ruim pra subir de nível, é ruim pra graduar pelo mesmo motivo.

Então a régua é a mesma da §5, com barra diferente:

|              | portão (§5)           | graduação                           |
| ------------ | --------------------- | ----------------------------------- |
| o que afirma | "perto de automático" | "automático"                        |
| consistência | ≥ 80% em 28 dias      | mais alta, e sustentada             |
| regularidade | estável ou em queda   | estável, faixa estreita             |
| resiliência  | sem falta dupla       | recupera sozinho após falha isolada |

Mesma família de medida, barra mais exigente. `N` deixa de existir como decisão; o que resta a calibrar são limiares — que a §5 já ia calibrar de qualquer forma.

---

## 8. A ordem dos níveis

### Por que sono primeiro — e não pelo motivo popular

A justificativa usual ("hábito-chave: conserta o sono e o resto vem junto") **não se sustenta**: a literatura indica que hábitos-chave raramente cascateiam — uma mudança quase nunca dispara outras.

O sono vem primeiro por outro motivo, esse com evidência direta: **dormir mal sabota ativamente os outros níveis.** Restrição de sono aumenta ingestão calórica e desloca a escolha de comida pra sabor em vez de saúde. Não é alavanca primeiro; é **sabotador primeiro**.

### O piso: lvl 0

Regredir do lvl 1 não teria pra onde ir, e é justamente no primeiro nível que a pessoa mais tende a bater — sem progresso acumulado pra amortecer.

**lvl 0 = registrar qualquer coisa, todo dia.** É o laço central do app, trivialmente alcançável, dá a primeira experiência de domínio, e ninguém cai abaixo dele. Também é o que o app já é hoje: um agregador.

### A escada

| nível | hábito                  | portão (comportamento)            |
| ----- | ----------------------- | --------------------------------- |
| 0     | registrar algo todo dia | piso, não se perde                |
| 1     | sono                    | consistência do horário de deitar |
| 2     | água                    | ingestão no alvo                  |
| 3     | alimentação             | número de refeições               |
| 4     | exercício               | frequência semanal                |
| 5     | estudo                  | frequência semanal                |

Água em 2 por ser o mais controlável dos restantes — vitória fácil logo depois do nível difícil. Exercício e estudo por último porque exigem bloco de tempo e agenda, que é o que mais falha.

---

## 9. Pular o que já está resolvido

A ordem é **sugerida, não imposta**. Obrigar quem já dorme bem a "conquistar" sono é irritante e destrói a credibilidade da jornada.

**O critério pra pular é o mesmo critério pra passar.** Não se pula o portão — entra-se nele já qualificado:

1. A pessoa indica que aquele hábito já está resolvido.
2. O app avalia o **histórico** dela na mesma janela de 28 dias que usaria pra qualquer um (§5).
3. Satisfez o portão → nível concedido, hábito entra **graduado**.
4. Não satisfez (ou não há histórico) → o app observa pra frente até haver evidência.

**Não há o que burlar**, porque a exigência de evidência é idêntica à do caminho normal. O app não acredita nem desacredita a pessoa: ele olha o dado. Pular deixa de ser atalho e vira **reconhecimento**.

Hábito pulado entra graduado porque, se satisfaz o portão sem esforço do app, já é automático por definição. Se depois degradar, o app **sugere revisitar** — não rebaixa. Rebaixar por um hábito que a pessoa nunca construiu pela jornada seria punir por algo que nunca foi promessa.

---

## 10. Estado que o modelo precisa

Hoje **metas não existem como dado** — as de `app/ajustes.jsx` são texto fixo, display-only. O que existe é registro com timestamp/quantidade, mais `computeDaysSinceLast` e `totalRecords` em `app/index.jsx`.

O modelo exige três coisas novas:

1. **Alvo por métrica e por pessoa.** Sem isso não há portão. "8h pra todo mundo" é mentira — tem gente que precisa de 7. Isto promove "metas personalizadas" de item de QoL a **fundação**.
2. **Estado de jornada:** nível atual, quais hábitos estão ativos, quais graduaram, e quando cada um entrou.
3. **Avaliação diária:** o veredito por hábito (no alvo / falhou), derivado dos registros — não digitado.

Tudo isso é puro-JS e cabe no `MergeableStore` que já existe. Nada aqui exige dep nativa; sincroniza junto com o resto de graça.

---

## 11. Decisões ainda em aberto

~~**O app segue servindo quem não quer jornada?**~~ **Resolvido pelo design (Turno 4).** A resposta é **hierarquia, não exclusão**: o hábito do nível ganha um bloco maior no topo, com número grande e botões de registro rápido; o resto vira uma segunda zona ("resto do dia") com linhas compactas, metade da altura, ainda tapáveis. Nada some. Rodapé explícito: "Tudo continua registrável. A ordem é sugerida."

**Os limiares de §5 e §7 ainda não têm dado que os sustente.** Ver §12 — a calibração tem caminho definido, mas ainda não foi feita.

~~**O que acontece com o histórico ao regredir.**~~ **Resolvido pelo design (Turno 4, tela 4a·2).** Aviso suave no topo, sem vermelho e sem "você falhou":

- o título é **"voltamos pra água"** — primeira pessoa do plural, o app voltou junto, não é a pessoa que falhou sozinha;
- o hábito perdido fica **"em pausa"**, nunca "perdido";
- linha explícita: "Nada do que você já registrou foi perdido. Você continua podendo registrar tudo";
- botão **"Ver histórico"** ao lado de "Entendi", pra provar em vez de afirmar;
- a copy do foco vira "Recomeço curto" — dimensiona o esforço de volta.

---

## 12. Calibração: instrumentar antes de gamificar

Os limiares da §5 e da §7 precisam de dado real. **Hoje esse dado não existe.**

Levantamento do histórico do dono do projeto em 14/08/2026 (sala autenticada no server de sync):

|                         |                             |
| ----------------------- | --------------------------- |
| registros totais        | 35                          |
| faixa                   | 04/08 → 14/08 — **10 dias** |
| dias com algum registro | 7 de 10                     |
| água                    | 23                          |
| sono                    | 6                           |
| alimentação             | 4                           |
| estudo                  | 2                           |
| exercício               | 0                           |

Com 6 registros de sono em 10 dias não se fecha nem a janela de 28 dias do portão, muito menos se observa uma curva de formação. Qualquer limiar derivado daqui seria chute com aparência de análise.

(Só o que sincronizou está visível. Registros que nunca subiram do aparelho não entram nessa conta.)

### O caminho: medir primeiro, pendurar consequência depois

Três opções foram consideradas:

1. **Derivar da literatura** (Lally: mediana 66 dias; com portão de 28, graduação por volta de 5–6 semanas depois). Defensável, mas fixa um calendário contra o qual a §3 e a §7 argumentam.
2. **Esperar acumular uso.** Honesto e lento — e o uso hoje não é consistente o bastante pra gerar o dado.
3. **Instrumentar já, com limiares configuráveis, sem consequência.** ✅

O app passa a computar consistência, regularidade e resiliência por métrica **desde já, sem nenhum nível pendurado nisso**. Em algumas semanas há curva real, e aí os limiares se fixam com dado.

**Efeito colateral desejável:** obriga a construir a parte analítica antes da gamificação, que é a ordem certa de risco. O cálculo pode estar errado sem machucar ninguém enquanto não houver nível dependendo dele.

**Consequência pro roadmap:** a primeira fatia de implementação não é nível nenhum — é medição silenciosa.

---

## 13. Honestidade sobre a evidência

Duas ressalvas, pra este documento não ser lido como mais sólido do que é:

**Ego depletion — base teórica do "1–2 hábitos por vez" — está no centro da crise de replicação da psicologia.** Não apoiar nada só nisso. A perna forte é a curva de automaticidade de Lally, que é medição direta e não teoria de recurso.

**Lally é n=96, autorrelato, 84 dias.** É o melhor que existe nesse desenho e ainda assim é um estudo, não uma lei. A faixa de 18 a 254 dias é enorme — o que reforça portão por sinal em vez de prazo.

O material sobre _recovery-first design_ é majoritariamente teórico e anedótico; o único número duro encontrado foi o **21% do Duolingo**.

### Fontes

- Lally et al. 2010, _How are habits formed_ — https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674
- BPS Research Digest, _How to form a habit_ — https://www.bps.org.uk/research-digest/how-form-habit
- The Behavioral Scientist, _How long to form a habit_ — https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit
- Apptitude, _How Duolingo's streak mechanic actually works_ — https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/
- The Decision Lab, _Streak Creep_ — https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification
- Yu-kai Chou, _Recovery-First Streak Design_ — https://yukaichou.com/gamification-analysis/recovery-first-streak-design/
- UX Magazine, _Psychology of Hot Streak Game Design_ — https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame
- HabitDex, _Never Miss Twice_ — https://habitdex.com/methods/never-miss-twice
- medRxiv, _The dark side of streaking_ — https://www.medrxiv.org/content/10.1101/2024.12.26.24319676.full.pdf
- Scientific Reports, _Insufficient sleep and dietary choices_ — https://www.nature.com/articles/s41598-025-08289-4
- PMC, _Sleep–diet interactions in lifestyle interventions_ — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9340846/
- _Why keystone habits rarely trigger other changes_ — https://www.aypexmove.com/post/why-keystone-habits-rarely-trigger-other-changes
- PMC, _Self-efficacy in habit building_ — https://pmc.ncbi.nlm.nih.gov/articles/PMC8137900/
- Stanford ASCEND, _Tiny Habits_ (Fogg) — https://med.stanford.edu/content/dam/sm/ascend/documents/Introduction_%20Tiny%20Habits%20for%20Self%20Compassion,%20Getting%20Started.pdf
