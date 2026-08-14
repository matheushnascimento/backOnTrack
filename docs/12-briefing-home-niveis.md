# Briefing para o Claude Design — Home com níveis

Instrução pronta pra ser passada ao Claude Design. Contexto, restrições e o que se espera de volta.

Fontes que este briefing pressupõe: [11-modelo-de-niveis.md](./11-modelo-de-niveis.md) (o modelo) e [09-design-v2.md](./09-design-v2.md) (tokens e tom já em produção).

---

## O produto

**Back on Track** é um acompanhador de métricas basais — sono, água, alimentação, exercício, estudo. Roda em Android (React Native) e web. Uso real, diário, por 6 pessoas.

Hoje a Home mostra as 5 métricas como cards iguais, e o app é um agregador: você abre, registra, sai.

## O que muda

O app passa a conduzir uma **jornada por níveis**. Um hábito por vez, conquistado até ficar estável, acumulando:

```
lvl 0   registrar algo todo dia          (piso — não se perde)
lvl 1   sono                             (consistência do horário de deitar)
lvl 2   + água
lvl 3   + alimentação
lvl 4   + exercício
lvl 5   + estudo
```

Regras que a interface precisa comunicar:

- **Cumulativo.** No lvl 2 o sono continua valendo.
- **Quem quebra o fluxo volta um nível** — não perde tudo, não zera.
- **Hábito maduro gradua** e deixa de poder derrubar, mas continua sendo exibido.
- **A ordem é sugerida.** Quem já tem um hábito resolvido pode pular, se o histórico comprovar.

## ⚠️ A restrição que manda em tudo

O tom canônico do app, já em produção, é **"retomada, não conquista"**: sem streaks, sem badges, sem exclamação, sem confete. Copy calma — "3 registros hoje. Sem pressa." em vez de "🎉 Parabéns!".

**A jornada não pode trair isso.** A referência declarada é o Fabulous, e o que se rejeita nele é exatamente a premissa lúdica poluindo a tela. Queremos a estrutura da jornada **sem a fantasia**.

Concretamente, o que **não** queremos:

- medalhas, troféus, mascotes, confete, animação de celebração
- barra de XP, pontos, moedas
- linguagem de jogo ("você desbloqueou!", "missão cumprida")
- vermelho ou alarme quando algo vai mal
- números grandes de ofensiva competindo por atenção

O nível é **contexto**, não prêmio. Ele diz "é isto que estamos construindo agora", não "olha o que você ganhou".

## O problema de design central

**A Home precisa servir duas coisas ao mesmo tempo, e elas puxam em direções opostas.**

1. **Jornada** — dar foco ao hábito do nível atual. Se tudo aparece igual, não há jornada.
2. **Agregador** — o dono do app usa as 5 métricas diariamente, hoje. Se o lvl 1 mostrar só sono, o app piora pra quem já o usa.

**Esta é a pergunta que queremos que o design responda**, e é onde queremos variantes. Não decidimos internamente de propósito.

Algumas direções possíveis (não exaustivas, não prescritivas):

- hierarquia em vez de exclusão — o hábito do nível em destaque, os outros presentes e menores
- o nível organiza a ordem, mas nada some
- duas zonas: "o que estamos construindo" e "o resto do dia"
- registro rápido de qualquer métrica sempre a um toque, independentemente do nível

## Telas pedidas

Prioridade em ordem. Se não der pra fazer todas, as três primeiras são as que importam.

1. **Home no lvl 2, dia normal.** O caso comum: um hábito em construção (água), um já conquistado (sono), três ainda não abertos. Precisa resolver o problema central acima.
2. **A regressão.** A tela mais difícil e a mais importante. Alguém acabou de voltar do lvl 3 pro lvl 2. Tem que ficar claro que (a) nada de registro foi perdido, (b) não é punição, (c) o caminho de volta é curto. Se essa tela der vontade de fechar o app, o modelo inteiro falha.
3. **Home no lvl 0/1.** O começo, quando quase nada foi conquistado. Risco de parecer vazio ou de parecer que o app foi capado.
4. **Subir de nível.** O momento da conquista, dentro do tom — reconhecimento, não celebração.
5. **Hábito graduado.** Como mostrar algo que virou automático e não pode mais te derrubar, sem sumir da tela.
6. **Pular um nível.** A pessoa diz que já dorme bem; o app confere o histórico e reconhece (ou diz que vai observar).

## Restrições técnicas

- **Tokens e tipografia já existem** — usar os de [09-design-v2.md](./09-design-v2.md). Inter (400/500/600) pro corpo, JetBrains Mono (400/500) pra labels em uppercase. Paleta: `brand-blue #2E5A88`, `brand-green #4CAF50`, `bg-canvas #F8F9FA`, `ink #0F1419`, mais os grays semânticos. **Não introduzir cor nova** sem necessidade forte e explicada.
- **Claro e escuro.** O app tem dark mode real, escolhido pelo usuário e persistido.
- **Android primeiro**, largura de celular. O web existe mas é secundário.
- Nada aqui deve exigir biblioteca de animação ou dependência nativa nova — o app se atualiza por OTA, e dep nativa obriga reinstalação.
- Ícones existentes: cada métrica já tem o seu, em SVG traço.

## O que ajuda mais na entrega

- Copy real nas telas, não _lorem ipsum_. O tom da copy **é** metade do design aqui.
- Quando houver decisão não óbvia, uma linha dizendo por quê.
- Se a resposta ao problema central for "não dá pra servir os dois, escolha", dizer isso — é uma resposta legítima e útil.
