# Escopo & MVP - Back on Track

## As métricas

O MVP cobre **5 métricas**, que são as que já existem como tela no código atual:

| #   | Métrica          | O que representa                                       |
| --- | ---------------- | ------------------------------------------------------ |
| 1   | Água             | Ingestão de água ao longo do dia                       |
| 2   | Sono             | Duração e, futuramente, qualidade do sono              |
| 3   | Alimentação      | Registro das refeições / qualidade alimentar           |
| 4   | Atividade física | Exercício ou movimento intencional                     |
| 5   | Estudo           | Tempo dedicado a aprendizado / desenvolvimento pessoal |

**Autocuidado** (tempo dedicado a cuidar de si: skincare, terapia, etc.) faz parte da visão original das "métricas mínimas", mas fica **fora do MVP** e vira item de expansão pós-MVP. Graças à modelagem de tabela única (ver ADR-007), adicioná-la no futuro será só incluir um novo valor de `tipo` - sem criar uma nova estrutura de dados nem uma tela-esqueleto do zero.

## Modelo de domínio: Registro

Como as 6 métricas compartilham estrutura, o sistema é modelado em torno de uma única entidade genérica - o **Registro** - em vez de 6 entidades separadas e desconectadas. Campos específicos de cada métrica fica isolada num campo de detalhes, mantendo o núcleo do modelo uniforme.

```typescript
interface Registro {
  id: string;
  // "autocuidado" fica reservado para a expansão pós-MVP.
  tipo: "agua" | "sono" | "alimentacao" | "atividade_fisica" | "estudo";
  data: string; // dia do registro, formato ISO (YYYY-MM-DD)
  quantidade: number; // valor principal — significado depende do tipo
  unidade: string; // "ml", "min", "sessao", etc.
  nota?: string; // observação livre, opcional
  detalhes?: Record<string, unknown>; // campos extras específicos do tipo
  criadoEm: number; // timestamp
  atualizadoEm: number; // timestamp
}
```

Exemplos de uso por tipo:

| Métrica          | Unidade sugerida | Exemplo de `quantidade` | Exemplo de `detalhes`                      |
| ---------------- | ---------------- | ----------------------- | ------------------------------------------ |
| Água             | ml               | 250 (um copo)           | —                                          |
| Sono             | min              | 480 (8h)                | `{ horaDormiu, horaAcordou }`              |
| Alimentação      | sessao           | 1                       | `{ refeicao: "almoço", qualidade: "boa" }` |
| Atividade física | min              | 30                      | `{ tipo: "corrida" }`                      |
| Estudo           | min              | 45                      | `{ assunto: "React Native" }`              |

Essa modelagem permite que **toda tela de registro, toda listagem e todo histórico usem o mesmo componente base**, variando apenas configuração.

> **Nota de estado atual:** o código de hoje ainda não usa este modelo. As telas gravam campos ad-hoc por métrica (`score`, `min`/`max`/`ideal`, `observation`, `training`/`cardio`, etc.). Convergir os dados existentes para este `Registro` unificado é o trabalho de M1 no roadmap.O campo de observação livre passa a se chamar `nota` (o código atual usa `observation`).

## Escopo do MVP (v1)

O que precisa existir para o app já substituir o papel no dia a dia:

- Registro rápido de cada uma das 5 métricas, em poucos toques
- Tela "hoje": visão consolidada do que já foi registrado no dia
- Histórico: lista de registros por data, navegável
- Editar e excluir um registro (hoje o código só tem criação; a store revisada já traz `update`/`remove`)
- Persistência local: o app funciona 100% offline desde o primeiro dia
- As 5 métricas usando a mesma estrutura de tela (mesmo componente, dados diferentes)

## Fora do MVP vem depois com milestone dedicado

- **Autocuidado como 6ª métrica**
- Sincronização em nuvem (M3 no roadmap, arquitetura já nasce pronta, mas a _ativação_ vem depois do MVP local estar validado)
- Gráficos e tendências
- Lembretes/notificações
- Metas personalizadas por métrica
- Temas visuais e identidade visual mais elaborada
- Exportação/backup de dados

## Non-goals (fora do escopo do projeto, de propósito)

- **Não é rede social.** Sem feed, compartilhamento ou comparação entre usuários.
- **Não é um tracker com dezenas de métricas.** O nome do projeto é literal: são as métricas _mínimas_, não máximas.
- **Não é multi-usuário/multi-perfil**, ao menos não nesta fase.

## Fluxos essenciais de usuário (MVP)

1. Abrir o app → ver o estado do dia atual (o que já foi registrado, o que falta)
2. Registrar uma métrica → poucos toques, sem formulários longos
3. Consultar histórico → navegar por datas anteriores
4. Corrigir um registro → editar ou excluir
