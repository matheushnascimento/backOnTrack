# Project Charter - Back on Track

## Visão

Uma ferramenta pessoal de registro rápido para as métricas mínimas de uma vida equilibrada (água, sono, autocuidado, alimentação, atividade física e estudo), rápida o suficiente para não repetir o problema que motivou o projeto: o custo de tempo do registro em papel.

## Objetivos

O projeto tem dois objetivos de mesmo peso:

1. **Funcional:** ter, no dia a dia, uma ferramenta que preserve os benefícios do registro manual (consistência, autoconhecimento) sem o custo de tempo que ele acumulou ao longo dos meses.
2. **Aprendizado:** aprender React Native de forma sólida, construindo algo que será mantido e usado por muito tempo, não descartado depois de um tutorial.

Nenhum dos dois pode ser sacrificado pelo outro: atalhos técnicos que comprometam o aprendizado, ou rigor acadêmico que atrase demais o uso real, falham no propósito do projeto.

## Justificativa

Alguns meses de registro analógico de métricas de saúde e autodesenvolvimento trouxeram resultados sólidos, mas o processo se tornou caro em tempo à medida que a rotina de registro se consolidou. O projeto existe para resolver esse custo de tempo — sem perder o que fazia o método em papel funcionar.

## O nome

"Back on Track" — voltar aos trilhos. Essas métricas representam o mínimo necessário para estar em plena capacidade física e mental. O projeto não busca otimização extrema; busca manter o básico consistentemente em dia.

> A visão completa contempla seis métricas (incluindo autocuidado). O MVP entrega as cinco que já existem no app — água, sono, alimentação, atividade física e estudo — e autocuidado fica como expansão planejada (ver Escopo & MVP). A meta de longo prazo segue sendo as seis.

## Público

Uso pessoal. Isso simplifica várias decisões (sem multi-usuário, sem necessidade de escalar horizontalmente), mas não reduz o padrão de qualidade, uma ferramenta de uso diário precisa ser confiável mesmo sendo usada por uma única pessoa.

## Princípios norteadores

- **Estrutura simples e semelhante entre as métricas.** O que funciona para uma deve funcionar, com o mínimo de adaptação, para as outras (ver modelo de domínio no documento de Escopo).
- **Sem "vibecoding".** Toda decisão técnica relevante é registrada com seu porquê (ver Decisões Técnicas).
- **Do básico ao "quality of life", sem pular etapas.** O roadmap é sequencial por design, não por acaso.
- **Fricção mínima no registro.** Se registrar algo no app custar mais tempo ou atenção do que no papel, o projeto falhou no seu propósito original.

## Critérios de sucesso

- O app substitui completamente o papel na rotina diária.
- Registrar uma métrica leva poucos segundos, sem fricção.
- Os dados sobrevivem a perda ou troca de aparelho.
- Ao final, o conhecimento de React Native adquirido é transferível para outros projetos — não é conhecimento de "copiar tutorial".
