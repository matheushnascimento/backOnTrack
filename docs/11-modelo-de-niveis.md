# Modelo de Níveis do Back on Track

Documento de desenho, escrito **antes** de qualquer código. Fixa o modelo, o que é decisão fechada, o que ainda está aberto, e em que evidência cada peça se apoia.

**Status:** em revisão. Tom decidido em §1.5 (reforço sóbrio). Design do Turno 4 (Claude Design, projeto `4565395c-…`) respondeu o briefing [12-briefing-home-niveis.md](./12-briefing-home-niveis.md) com 6 telas e fechou duas decisões, ver §11. Fechado: cumulativo, regressão em vez de ofensiva, portão por sinal e por comportamento, três regras de quebra (diária binária, diária quantitativa, semanal), graduação, ordem sugerida com skip qualificado. Aberto: ver §11.

Referência declarada: **Fabulous** (habit tracker científico, modelo de jornada). O que se rejeita nele: não engaja, e a premissa lúdica polui. Queremos a jornada, sem a fantasia.

Este documento **não** altera o `04-roadmap-milestones.md`. O roadmap só muda quando o modelo estiver fechado.

---

## 1. A ideia em uma frase

O app deixa de tratar 5 métricas como iguais e passa a conduzir uma **jornada**: um hábito por vez, conquistado até ficar estável, acumulando, e quem quebra o fluxo **volta um nível** em vez de perder tudo.

```
lvl 1   sono
lvl 2   sono + água
lvl 3   sono + água + <próximo>
...
```

**Cumulativo** (decidido): no lvl 2 o sono continua valendo. Não é uma esteira em que o anterior sai de cena.

---

## 1.5. O tom: reforço sóbrio

**Decidido em 14/08/2026.** Antes disto o tom era _herdado_, não decidido: o `09-design-v2.md` (M5-B, #233) diz "retomada, não conquista: sem streaks, sem badges, sem exclamação", e o briefing de design transformou isso numa proibição dura de qualquer recompensa visível. Ninguém tinha ratificado essa extensão.

⚠️ **E ela escondia uma contradição: nós ESTAMOS gamificando.** Nível, progressão, portão e regressão são mecânica de jogo, e das fortes. O que se rejeita é o **registro visual** do jogo, não a mecânica. Dizer "sem gamificação" era impreciso.

**A posição é reforço sóbrio:** subir de nível e graduar **são momentos**, reconhecidos, visíveis, com peso. Mas sem vocabulário nem estética de jogo: nada de medalha, XP, confete, mascote, "você desbloqueou!". Reconhecimento, não premiação.

O que isso preserva: loss aversion e reconhecimento visível são parte do que faz ofensiva funcionar. O Duolingo não cresceu com números discretos em cinza. Remover **todo** reforço visível arriscava jogar fora o motor junto com o barulho. A queixa contra o Fabulous é excesso de fantasia, não a existência de recompensa.

**Onde isso NÃO se aplica:** superfícies de diagnóstico, como o bloco de sinais em Ajustes → Avançado (#285). Ali o tom frio é correto: é instrumento de calibração, e não superfície de reforço. Se parecesse placar, viraria o barulho que se quer evitar.

**Ideia futura, fora de escopo:** dar ao usuário a escolha do registro: sóbrio, reforço sóbrio, ou lúdico assumido. Engajamento é pessoal: assim como o dono do projeto não engaja com o lúdico do Fabulous, muita gente não engaja com o sóbrio. Mudança grande, depende de investimento, registrada como direção, e não como plano.

---

## 2. Por que regressão em vez de ofensiva zerada

A objeção natural é que punir contradiz a voz do app, que fala "sem pressa", "sem cobrança", e reserva `danger` só pro destrutivo (ver `08-design-tokens.md`).

**O argumento se inverte quando se olha a alternativa.** Ofensiva é que é brutal: 45 dias viram zero por uma noite. Perder um nível preserva quase todo o progresso e devolve a pessoa a um hábito que ela **já provou** que consegue, e reconquistar é mais fácil que da primeira vez. É decaimento gradual em vez de penhasco.

A evidência é desfavorável à ofensiva pura:

- Ofensiva zerada produz **quit moment, não restart moment**: vergonha e abandono, não motivação renovada.
- O mecanismo tem nome desde os anos 70: **what-the-hell effect** (Polivy & Herman). Depois de um deslize, a pessoa não volta ao plano; abandona de vez, porque o custo de quebrar mais caiu a zero. Mesma família do _abstinence violation effect_: quem mira perfeição desiste mais depois de um único escorregão.
- O próprio **Duolingo**, que popularizou a ofensiva, recuou: o **Streak Freeze cortou churn em 21%** entre usuários em risco, e o achado deles foi que **facilitar a manutenção aumentou engajamento _e_ resultado de aprendizado**.

A regressão também é coerente com o que o app já faz: o estado de retomada (#242) não cobra quem sumiu por 3 dias, convida. A regressão é esse mesmo gesto, mecanizado.

---

## 3. O portão de nível NÃO é tempo

A proposta inicial era subir de nível após 1–2 semanas sustentadas. **A pesquisa contradiz isso.**

- Lally et al. (UCL, 2010), n=96: mediana de **66 dias** até o comportamento virar automático, faixa de **18 a 254**.
- A literatura converge em **1–2 hábitos novos por vez** como teto, porque acima disso a tendência é falharem todos, porque na fase ativa cada um ainda consome esforço consciente.

Cruzando com o cumulativo: subir em 2 semanas empilha o segundo hábito enquanto o primeiro ainda está a ~50 dias de ser automático. É exatamente o modo de falha documentado: cumulativo com escada rápida vira castelo de cartas, e a regressão deixa de ser gentil: vira inevitável.

**Portanto o portão é sinal, não calendário.** Sobe de nível quando o hábito anterior dá sinais de estar perto de automático. A faixa de 18 a 254 dias é justamente o argumento contra prazo fixo: as pessoas diferem demais.

---

## 4. O portão é comportamento, nunca desfecho

**Não se habitua um resultado.** Ninguém decide dormir 7h30. Decide-se deitar às 23h30. A duração é consequência de ansiedade, cafeína, barulho, criança acordando.

Das cinco métricas, o sono é a única em que o número registrado **não é um comportamento**:

| métrica     | o que se registra      | é comportamento? |
| ----------- | ---------------------- | ---------------- |
| água        | você bebeu             | ✅ controlável   |
| exercício   | você treinou           | ✅ controlável   |
| alimentação | você comeu             | ✅ controlável   |
| estudo      | você estudou           | ✅ controlável   |
| **sono**    | **quanto você dormiu** | ❌ **desfecho**  |

Se o portão do nível fosse duração de sono, o app rebaixaria alguém por algo fora do seu controle. Isso é pior que ofensiva zerada: é punição por azar.

**Regra:** o portão de nível é sempre um comportamento. No sono, é a consistência do horário de deitar. A duração segue registrada e exibida, porque é o que importa pra pessoa, mas não decide nível.

### 4.1 A unidade é a ocasião, e não a quantidade (revisão de 15/09/2026)

A tabela acima estava certa e incompleta. Ela separa bem o sono das outras quatro, e deixa passar que **as outras quatro também gateavam desfecho**, por outra porta: o veredito do dia era `soma >= alvo`, então o que decidia nível era _quanto_, e não _se_.

O levantamento do §12 mostrou o preço disso. Água: 60 registros, 15 dias com registro, **nenhum** chegando aos 2000ml, consistência 0,00. Ninguém bebe 800ml por dia, que era a mediana. O sinal media o quanto foi **registrado**, e não o hábito.

**A literatura mede ocasião.** Lally registrava, todo dia, se o comportamento foi realizado, de forma binária, nunca quanto. Gardner resume a receita como repetir um comportamento no mesmo contexto até ficar automático. A revisão "habit as automaticity, not frequency" coloca a automaticidade como ingrediente ativo e a repetição como precursor dela. Dose aparece uma vez, no exercício, como cerca de 4 sessões por semana, o que é **frequência de ocasiões**, e não quantidade por ocasião.

**Regra revisada:** a unidade do veredito diário é a **ocasião em contexto**. A quantidade continua exibida, porque é informação útil sobre o dia, e deixa de decidir nível.

| métrica           | comportamento | unidade do veredito  |
| ----------------- | ------------- | -------------------- |
| sono              | deitar        | 1 ocasião no dia     |
| alimentação       | comer         | N ocasiões no dia    |
| água              | beber         | N ocasiões no dia    |
| exercício, estudo | fazer         | N ocasiões na semana |

**Quantas ocasiões** cada uma exige fica em aberto de propósito. É exatamente o número que precisa vir de medição, e a série de dado correto começou em 11/09, depois de o §5 passar a medir a coisa certa.

### 4.2 O desenho do sono, com os papéis separados

Estar habituado a deitar no mesmo horário não garante dormir bem. Por isso o acordar continua valendo a pena, e entra como informação em vez de exigência:

|                    | papel         | consequência                                           |
| ------------------ | ------------- | ------------------------------------------------------ |
| horário de deitar  | comportamento | consistência e regularidade, decide nível              |
| horário de acordar | opcional      | habilita a duração                                     |
| duração            | desfecho      | lida contra a faixa de suficiência, nunca decide nível |
| qualidade          | percepção     | informação                                             |

A **faixa de suficiência** (7h a 8h, #341) ganha aqui a função que ela de fato tem: referência de leitura para quando houver duração, e não meta a bater.

**Fricção mínima.** Se deitar é o mínimo viável, exigir acordar e qualidade pra salvar contraria o comportamento que se quer repetir. O registro salva com o horário de deitar sozinho.

**O que a implementação fazia de diferente do que esta seção sempre disse:** o sono virava `presence` genérico, contando qualquer registro em vez do ato de deitar, e a duração ocupava o lugar de número principal da tela. O §4 já dizia "no sono, é a consistência do horário de deitar" e "`bed` já é o dado" desde 14/08. O dado só passou a existir no #328, e a regularidade só passou a usá-lo no #343.

Isso reaproveita o sinal de regularidade da §5: `bed` já é o dado, e é comportamento e proxy de automaticidade ao mesmo tempo.

Base: auto-eficácia e o modelo do Fogg convergem em que hábito pega quando a habilidade exigida é mínima e a pessoa acumula experiências de domínio. Gatear por desfecho quebra as duas coisas.

---

## 5. Como medir "perto de automático" com o dado que já temos

Lally mediu automaticidade com questionário (SRHI). Não temos isso, e não queremos: questionário é fricção, e o app inteiro é construído em cima de registro rápido.

O que temos é `records` com `createdAt`, `quantity` e `type`. Dá pra montar um **proxy comportamental** com três sinais:

| sinal            | o que é                                             | por que indica automaticidade                                                                                                |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **consistência** | % de dias com a ocasião cumprida, janela de 28 dias | o óbvio: o comportamento acontece                                                                                            |
| **regularidade** | dispersão do horário do comportamento               | comportamento automático é disparado por contexto e acontece em horário estável; variabilidade cai conforme o hábito assenta |
| **resiliência**  | falhou e voltou no dia seguinte?                    | hábito automático se recupera sozinho; hábito frágil vira duas faltas                                                        |

**A regularidade é o sinal mais interessante e o menos óbvio**, e é quase de graça, porque todo registro já tem timestamp.

⚠️ **Timestamp de registro não é horário do comportamento.** Por um mês o sinal leu `createdAt`, ou seja a hora em que a pessoa abriu o app, então quem deitava sempre às 23h30 e registrava em horários variados aparecia irregular. Desde o #343 o sono usa `bed`, e as duas fontes **não se misturam** na mesma janela: somar a variação do deitar com a do registrar dá um número pior que qualquer um dos dois puros. A consequência aceita é o `n` despencar na virada, porque dizer "ainda não tenho a medida certa" é melhor que responder com a errada.

Isso também é o que a §4.1 pede: se a unidade é a ocasião em contexto, o horário que interessa é o da ocasião.

⚠️ **Isto é proxy, não medida.** Não estamos medindo automaticidade; estamos inferindo de comportamento observável. Os limiares abaixo são **ponto de partida pra calibrar com dado real**, não verdades:

- consistência ≥ 80% em 28 dias
- desvio do horário habitual estável ou em queda
- nenhuma falta dupla na janela

O primeiro usuário com dado suficiente pra calibrar é o próprio dono do projeto, com registros desde julho.

**Estado em 15/09:** o levantamento foi feito e está no §12. Ele não fechou a calibração, e sim mostrou que dois dos três sinais mediam a coisa errada. A série que serve pra calibrar começou em 11/09, depois das correções.

---

## 6. O que conta como quebrar: três regras, não uma

As métricas não são todas do mesmo tipo, e tratá-las igual seria erro:

| tipo                    | exemplo                        | pergunta           | regra de quebra                          |
| ----------------------- | ------------------------------ | ------------------ | ---------------------------------------- |
| **binário diário**      | tomar água, registrar refeição | "fez?"             | **duas faltas consecutivas**             |
| **quantitativo diário** | horário de deitar              | "foi suficiente?"  | **média móvel de 7 dias abaixo do alvo** |
| **frequência semanal**  | exercício, estudo              | "manteve o ritmo?" | **duas semanas seguidas abaixo do alvo** |

**Por que duas faltas no binário:** Lally mostra que perder **um** dia custa menos de meio ponto de automaticidade e recupera rápido. A segunda falta consecutiva é onde o laço quebra: "falhar uma vez é acidente, falhar duas é o começo de um hábito novo". Simples de explicar e alinhado com o dado.

**Por que média móvel no quantitativo:** a pergunta não é binária. Uma noite de 5h no meio de uma semana boa não é quebra; sete noites de 6h são. Média móvel perdoa o acidente e pega o padrão.

**Por que semanal em exercício e estudo:** eles não são hábitos diários, e costumam ser 3–5×/semana. Aplicar "duas faltas consecutivas" rebaixaria alguém por não treinar sábado e domingo, ou seja, **por descansar**. A unidade certa é a semana, e a lógica é a mesma do binário: uma semana ruim é acidente, duas seguidas são padrão.

A semana é **calendário (seg–dom)**, não janela móvel: é como as pessoas planejam ("essa semana treinei 3×"), é legível na UI, e o app já tem a tela Semana. Janela móvel seria mais contínua e menos compreensível: o nível cairia numa terça sem que nada tivesse mudado naquele dia.

---

## 7. Graduação: hábito maduro para de poder derrubar

Sem isso, cumulativo é insustentável por aritmética. Se cada hábito tem ~90% de chance de se sustentar numa semana, cinco hábitos juntos têm 0,9⁵ ≈ **59%**; sete, **48%**. A partir de certo nível a pessoa quebraria alguma coisa quase toda semana e oscilaria pra sempre.

A saída não é afrouxar a regra: é reconhecer que **hábito automático não disputa o mesmo recurso.** Escovar os dentes não exige força de vontade. O argumento de esgotamento vale pra fase de formação ativa, não depois.

**Regra:** o hábito **gradua** quando os três sinais da §5 se sustentam numa barra mais alta. Continua sendo acompanhado e exibido, mas deixa de poder causar regressão. Só hábitos **não graduados** entram no cálculo de quebra.

### Por que graduação é sinal, e não "N semanas"

A primeira versão deste documento definia graduação como "N semanas além do portão". **Isso contradizia a §3.**

A §3 estabelece que o portão de nível é sinal e não calendário, justamente porque a faixa de automaticidade vai de 18 a 254 dias e prazo fixo seria arbitrário. Definir graduação por semanas fixas reintroduz exatamente o calendário que acabamos de rejeitar: se prazo fixo é ruim pra subir de nível, é ruim pra graduar pelo mesmo motivo.

Então a régua é a mesma da §5, com barra diferente:

|              | portão (§5)           | graduação                           |
| ------------ | --------------------- | ----------------------------------- |
| o que afirma | "perto de automático" | "automático"                        |
| consistência | ≥ 80% em 28 dias      | mais alta, e sustentada             |
| regularidade | estável ou em queda   | estável, faixa estreita             |
| resiliência  | sem falta dupla       | recupera sozinho após falha isolada |

Mesma família de medida, barra mais exigente. `N` deixa de existir como decisão; o que resta a calibrar são limiares, que a §5 já ia calibrar de qualquer forma.

---

## 8. A ordem dos níveis

### Por que sono primeiro, e não pelo motivo popular

A justificativa usual ("hábito-chave: conserta o sono e o resto vem junto") **não se sustenta**: a literatura indica que hábitos-chave raramente cascateiam, e uma mudança quase nunca dispara outras.

O sono vem primeiro por outro motivo, esse com evidência direta: **dormir mal sabota ativamente os outros níveis.** Restrição de sono aumenta ingestão calórica e desloca a escolha de comida pra sabor em vez de saúde. Não é alavanca primeiro; é **sabotador primeiro**.

### O piso: lvl 0

Regredir do lvl 1 não teria pra onde ir, e é justamente no primeiro nível que a pessoa mais tende a bater, sem progresso acumulado pra amortecer.

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

Água em 2 por ser o mais controlável dos restantes, com vitória fácil logo depois do nível difícil. Exercício e estudo por último porque exigem bloco de tempo e agenda, que é o que mais falha.

---

## 9. Pular o que já está resolvido

A ordem é **sugerida, não imposta**. Obrigar quem já dorme bem a "conquistar" sono é irritante e destrói a credibilidade da jornada.

**O critério pra pular é o mesmo critério pra passar.** Não se pula o portão. Entra-se nele já qualificado:

1. A pessoa indica que aquele hábito já está resolvido.
2. O app avalia o **histórico** dela na mesma janela de 28 dias que usaria pra qualquer um (§5).
3. Satisfez o portão → nível concedido, hábito entra **graduado**.
4. Não satisfez (ou não há histórico) → o app observa pra frente até haver evidência.

**Não há o que burlar**, porque a exigência de evidência é idêntica à do caminho normal. O app não acredita nem desacredita a pessoa: ele olha o dado. Pular deixa de ser atalho e vira **reconhecimento**.

Hábito pulado entra graduado porque, se satisfaz o portão sem esforço do app, já é automático por definição. Se depois degradar, o app **sugere revisitar**, sem rebaixar. Rebaixar por um hábito que a pessoa nunca construiu pela jornada seria punir por algo que nunca foi promessa.

---

## 10. Estado que o modelo precisa

Hoje **metas não existem como dado**: as de `app/ajustes.jsx` são texto fixo, display-only. O que existe é registro com timestamp/quantidade, mais `computeDaysSinceLast` e `totalRecords` em `app/index.jsx`.

O modelo exige três coisas novas:

1. **Alvo por métrica e por pessoa.** Sem isso não há portão. "8h pra todo mundo" é mentira, porque tem gente que precisa de 7. Isto promove "metas personalizadas" de item de QoL a **fundação**.
2. **Estado de jornada:** nível atual, quais hábitos estão ativos, quais graduaram, e quando cada um entrou.
3. **Avaliação diária:** o veredito por hábito (no alvo / falhou), derivado dos registros, e não digitado.

Tudo isso é puro-JS e cabe no `MergeableStore` que já existe. Nada aqui exige dep nativa; sincroniza junto com o resto de graça.

---

## 11. Decisões ainda em aberto

~~**O app segue servindo quem não quer jornada?**~~ **Resolvido pelo design (Turno 4).** A resposta é **hierarquia, não exclusão**: o hábito do nível ganha um bloco maior no topo, com número grande e botões de registro rápido; o resto vira uma segunda zona ("resto do dia") com linhas compactas, metade da altura, ainda tapáveis. Nada some. Rodapé explícito: "Tudo continua registrável. A ordem é sugerida."

**Os limiares de §5 e §7 ainda não têm dado que os sustente.** Ver §12: a calibração tem caminho definido, mas ainda não foi feita.

~~**O que acontece com o histórico ao regredir.**~~ **Resolvido pelo design (Turno 4, tela 4a·2).** Aviso suave no topo, sem vermelho e sem "você falhou":

- o título é **"voltamos pra água"**, primeira pessoa do plural, o app voltou junto, não é a pessoa que falhou sozinha;
- o hábito perdido fica **"em pausa"**, nunca "perdido";
- linha explícita: "Nada do que você já registrou foi perdido. Você continua podendo registrar tudo";
- botão **"Ver histórico"** ao lado de "Entendi", pra provar em vez de afirmar;
- a copy do foco vira "Recomeço curto", que dimensiona o esforço de volta.

---

## 12. Calibração: instrumentar antes de gamificar

Os limiares da §5 e da §7 precisam de dado real. **Hoje esse dado não existe.**

Levantamento do histórico do dono do projeto em 14/08/2026 (sala autenticada no server de sync):

|                         |                            |
| ----------------------- | -------------------------- |
| registros totais        | 35                         |
| faixa                   | 04/08 → 14/08, **10 dias** |
| dias com algum registro | 7 de 10                    |
| água                    | 23                         |
| sono                    | 6                          |
| alimentação             | 4                          |
| estudo                  | 2                          |
| exercício               | 0                          |

Com 6 registros de sono em 10 dias não se fecha nem a janela de 28 dias do portão, muito menos se observa uma curva de formação. Qualquer limiar derivado daqui seria chute com aparência de análise.

### Levantamento de 11/09/2026: 108 registros, 38 dias

Rodado com o código de produção sobre a mesma sala, e não com uma reimplementação:

| métrica     | n   | consistência | regularidade           | passa no portão |
| ----------- | --- | ------------ | ---------------------- | --------------- |
| sono        | 26  | 0,71         | 20 amostras, sd 139min | não             |
| água        | 60  | **0,00**     | 37, sd 213min          | não             |
| alimentação | 19  | 0,07         | 15, sd 433min          | não             |
| exercício   | 1   | 0,04         | sem amostra            | não             |
| estudo      | 2   | 0,00         | sem amostra            | não             |

> ⚠️ **A linha do sono está errada.** Aqueles `139min` são dispersão da hora de REGISTRAR, não do horário de deitar. O #344 tinha entrado na main naquele mesmo dia, mas não funcionava no app: ele lia `registro.bed`, e os sinais recebem a linha crua do store, onde `bed` mora dentro do JSON `details`. A leitura devolvia `undefined` e caía no `createdAt`. Só o #356 (18/09) corrigiu. Ver o levantamento de 18/09 abaixo, e a issue #357.
>
> As demais linhas seguem válidas: água, alimentação, exercício e estudo não gravam horário de evento, então usam `createdAt` por desenho.

**Três achados, que valem mais que os números.**

**1. Em métrica `sum`, consistência mede o quanto foi REGISTRADO.** Água tem alvo de 2000ml. Em 15 dias com registro, nenhum chegou lá: melhor dia 1600, mediana 800. Ninguém bebe 800ml por dia. "Não fiz" e "não registrei" são indistinguíveis, e o dado diz que o segundo domina.

Isso colide com o §4, que fixou o portão em comportamento e nunca em resultado. Foi por isso que o sono virou `presence`; as outras quatro seguem `sum` e reintroduzem o problema por outra porta. **Calibrar limiar não resolve: com consistência zero, nenhum número separa nada.**

**2. O portão está acima do melhor observado.** O usuário mais ativo do projeto, depois de 38 dias, não passa em sono: 0,71 contra os 0,80 exigidos.

A consistência ali é defensável: `presence` significa "registrou naquele dia", e 0,80 são 22 de 28 dias, um padrão honesto pra hábito em formação. O número diz que o hábito não fechou, e não que a régua está torta.

> ⚠️ **Corrigido em 18/09.** A versão original deste achado também citava "139min contra os 120 de dispersão máxima", e essa metade estava invertida. Medida pelo horário de deitar, a dispersão do mesmo usuário é de 27min, folgadamente **abaixo** do teto. Não há evidência de que o limiar de dispersão esteja apertado. Ver o levantamento de 18/09.

**3. A regularidade media a hora de ABRIR O APP.** O sinal lia `createdAt`, então quem deitava sempre às 23h30 e registrava em horários variados aparecia irregular. O #343 e o #344 trocaram a leitura pra `bed` (gravado desde o #328). O mesmo PR revelou um bug que já existia: com dispersão exatamente zero a raiz virava `NaN`, e como o portão compara `sdMinutes <= max`, **quem fosse perfeito era reprovado por isso**.

> ⚠️ **A troca não chegou ao app até 18/09.** O código novo lia `registro.bed`, e os quatro consumidores dos sinais passam a linha crua do store, onde `bed` está dentro do `details`. Os testes montavam o registro hidratado, com `bed` no topo, então a suíte ficou verde por uma semana enquanto o app seguia medindo `createdAt`. O #356 acrescentou um leitor que aceita os dois formatos, e testes que usam o formato exato da linha crua.
>
> A lição vale além deste caso: **teste que monta o insumo num formato que a produção não usa não prova ligação nenhuma.** É a mesma armadilha catalogada como capacidade pura sem fio.

### Levantamento de 18/09/2026: o primeiro com a regularidade certa

Refeito depois do #356, com o código de produção sobre a linha crua do store, que é o formato que o app usa. Sala do dono do projeto: 126 registros no total, de 04/08 a 18/09, sendo 65 em 20 dias dentro da janela de 28.

| métrica     | n   | consistência | regularidade           | falhas duplas | portão |
| ----------- | --- | ------------ | ---------------------- | ------------- | ------ |
| sono        | 19  | 0,64         | 5 amostras, sd 27min   | 4             | não    |
| água        | 30  | 0,00         | 30 amostras, sd 173min | 27            | não    |
| alimentação | 15  | 0,11         | 15 amostras, sd 401min | 22            | não    |
| exercício   | 1   | 0,04         | sem amostra            | 25            | não    |
| estudo      | 0   | 0,00         | sem amostra            | 27            | não    |

Segunda sala autenticada, com uso bem menor (24 registros, 14 na janela em 5 dias): sono 0,14 sem amostra de regularidade, água 0,00 com sd 232min, o resto com um registro ou nenhum.

**O que muda em relação a 11/09.**

**A dispersão do sono despenca de 139min para 27min.** Os cinco horários de deitar registrados são 00:36, 23:42, 00:08, 00:10 e 01:00, um agrupamento de cerca de 78 minutos em torno da meia-noite. O 139min anterior era a variação da hora de abrir o app, que é outro fenômeno.

**O que barra o sono no portão passa a ser outra coisa.** Três critérios reprovam, e nenhum deles é a dispersão:

| critério      | exigido  | observado |
| ------------- | -------- | --------- |
| consistência  | ≥ 0,80   | 0,64      |
| amostras      | ≥ 8      | 5         |
| falhas duplas | 0        | 4         |
| dispersão     | ≤ 120min | **27min** |

**A escassez de amostra é temporária e tem data.** Só 5 dos 31 registros de sono carregam horário de deitar, e o primeiro é de 13/09, porque o campo só passou a ser gravado no #328. O `regularityMinSamples: 8` é hoje o critério mais apertado por acidente de calendário, e se resolve sozinho conforme a janela anda. Não é sinal de limiar mal escolhido.

**As falhas duplas não tinham sido notadas como barreira.** O portão exige zero, e o sono tem 4 na janela. Nas outras métricas o número beira o tamanho da própria janela (22 a 27 de 28 dias), porque quase todo dia é falha. Com a regra atual, qualquer coisa que não seja quase diária nunca passa. Isso merece decisão à parte, e conversa com a §6.

**O achado 1 segue de pé, intocado.** Água com 30 registros e consistência 0,00 é o mesmo problema de métrica `sum` medindo o quanto foi registrado.

### Onde a calibração parou

Duas mudanças saíram do levantamento: o sono passou a exibir **faixa de suficiência** em vez de 8h cravado (#341), e a regularidade passou a medir a hora de deitar (#343, #344, e de fato só no #356).

**Os limiares seguem provisórios**, agora por um motivo diferente do de agosto: a série de dado correto para a regularidade do sono **começa em 18/09**, com o #356. A tentativa anterior datava de 11/09, mas aquele código nunca rodou no app, então não há série a recuperar ali.

Com 5 noites com horário gravado, a janela de 28 dias só fica cheia por volta de meados de outubro. Antes disso, qualquer número de regularidade do sono é amostra pequena, e o `regularityMinSamples: 8` reprova por construção.

**Decisão de modelo ainda pendente:** o que "consistência" deve significar numa métrica de soma. As opções levantadas foram contar o dia em que houve qualquer registro, como no sono, ou baixar as metas ao que é de fato registrado, que ajusta o alvo ao instrumento e por isso parece pior.

(Só o que sincronizou está visível. Registros que nunca subiram do aparelho não entram nessa conta.)

### O caminho: medir primeiro, pendurar consequência depois

Três opções foram consideradas:

1. **Derivar da literatura** (Lally: mediana 66 dias; com portão de 28, graduação por volta de 5–6 semanas depois). Defensável, mas fixa um calendário contra o qual a §3 e a §7 argumentam.
2. **Esperar acumular uso.** Honesto e lento, e o uso hoje não é consistente o bastante pra gerar o dado.
3. **Instrumentar já, com limiares configuráveis, sem consequência.** ✅

O app passa a computar consistência, regularidade e resiliência por métrica **desde já, sem nenhum nível pendurado nisso**. Em algumas semanas há curva real, e aí os limiares se fixam com dado.

**Efeito colateral desejável:** obriga a construir a parte analítica antes da gamificação, que é a ordem certa de risco. O cálculo pode estar errado sem machucar ninguém enquanto não houver nível dependendo dele.

**Consequência pro roadmap:** a primeira fatia de implementação é medição silenciosa, sem nível nenhum.

---

## 13. Honestidade sobre a evidência

Duas ressalvas, pra este documento não ser lido como mais sólido do que é:

**Ego depletion, a base teórica do "1–2 hábitos por vez", está no centro da crise de replicação da psicologia.** Não apoiar nada só nisso. A perna forte é a curva de automaticidade de Lally, que é medição direta e não teoria de recurso.

**Lally é n=96, autorrelato, 84 dias.** É o melhor que existe nesse desenho e ainda assim é um estudo, não uma lei. A faixa de 18 a 254 dias é enorme, o que reforça portão por sinal em vez de prazo.

O material sobre _recovery-first design_ é majoritariamente teórico e anedótico; o único número duro encontrado foi o **21% do Duolingo**.

### Fontes

- Lally et al. 2010, _How are habits formed_: https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674
- BPS Research Digest, _How to form a habit_: https://www.bps.org.uk/research-digest/how-form-habit
- The Behavioral Scientist, _How long to form a habit_: https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit
- Apptitude, _How Duolingo's streak mechanic actually works_: https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/
- The Decision Lab, _Streak Creep_: https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification
- Yu-kai Chou, _Recovery-First Streak Design_: https://yukaichou.com/gamification-analysis/recovery-first-streak-design/
- UX Magazine, _Psychology of Hot Streak Game Design_: https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame
- HabitDex, _Never Miss Twice_: https://habitdex.com/methods/never-miss-twice
- medRxiv, _The dark side of streaking_: https://www.medrxiv.org/content/10.1101/2024.12.26.24319676.full.pdf
- Scientific Reports, _Insufficient sleep and dietary choices_: https://www.nature.com/articles/s41598-025-08289-4
- PMC, _Sleep–diet interactions in lifestyle interventions_: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9340846/
- _Why keystone habits rarely trigger other changes_: https://www.aypexmove.com/post/why-keystone-habits-rarely-trigger-other-changes
- PMC, _Self-efficacy in habit building_: https://pmc.ncbi.nlm.nih.gov/articles/PMC8137900/
- Stanford ASCEND, _Tiny Habits_ (Fogg): https://med.stanford.edu/content/dam/sm/ascend/documents/Introduction_%20Tiny%20Habits%20for%20Self%20Compassion,%20Getting%20Started.pdf
