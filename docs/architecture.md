# Arquitetura do OctoFit Tracker

O OctoFit Tracker é uma aplicação de três camadas para um programa de atividades físicas escolar. O código inicial inclui contratos de API e pontos de implementação intencionalmente incompletos para que você use o modo agent do GitHub Copilot em um ciclo guiado por testes.

```mermaid
flowchart LR
    Browser["Navegador"]
    UI["Apresentação<br/>React 19 · Vite · React Router · Bootstrap<br/>Porta 3000 · pública"]
    API["Lógica<br/>Express · TypeScript · serviços<br/>Porta 8000 · pública"]
    DB["Dados<br/>Mongoose · MongoDB<br/>Porta 27017 · privada"]
    Contracts["Contratos executáveis<br/>Atividades · Equipes · Placar · Sugestões"]

    Browser --> UI
    UI -->|HTTP /api via proxy Vite| API
    API -->|Mongoose| DB
    Contracts -. verificam .-> UI
    Contracts -. verificam .-> API
    Contracts -. verificam .-> DB
```

## Limites entre as camadas

- **Camada de apresentação**: React 19, Vite, React Router, Bootstrap e um cliente compartilhado da API em `octofit-tracker/frontend/src`.
- **Camada de lógica**: rotas e serviços Express com TypeScript em `octofit-tracker/backend/src` expõem o comportamento `/api/*` na porta `8000`.
- **Camada de dados**: modelos Mongoose e dados de demonstração em `octofit-tracker/backend/src/models` e `src/scripts/seed.ts` são persistidos no MongoDB na porta `27017`.

## Portas e regras de ambiente

- MongoDB: `27017` (privada)
- API Express: `8000` (pública)
- Interface Vite: `3000` (pública)
- O navegador acessa caminhos relativos `/api`. O Vite os encaminha para `http://localhost:8000`; `VITE_API_BASE_URL` pode substituir a URL-base.
- Não encaminhe nem torne públicas outras portas.

## Contrato da API

| Capacidade | Método e caminho | Comportamento esperado |
| --- | --- | --- |
| Registro de atividades | `GET /api/activities`, `POST /api/activities` | Lista e cria atividades válidas. POST recebe `userId`, `teamId`, `type` e `minutes`; `userId` e `teamId` devem ser IDs bem-formados de uma pessoa e uma equipe existentes, caso contrário a API retorna um 4xx intencional (nunca um 500 causado por erro de conversão). Uma atividade criada armazena `user`, `team`, `type` e `minutes` enviados, além de `points` e `occurredAt` calculados. |
| Equipes | `GET /api/teams`, `POST /api/teams` | Lista e cria equipes com integrantes. As equipes criadas e listadas mantêm os valores enviados em `name` e `mascot`. Rejeita uma equipe sem nome com `400`. |
| Placar | `GET /api/leaderboard` | Retorna as equipes ordenadas pela soma dos pontos de suas atividades, da maior para a menor. Cada item contém `teamName`, `totalPoints` e uma `rank` iniciada em 1. |
| Sugestões de treino | `GET /api/workouts/suggestions/:userEmail` | Recomenda treinos com base nos padrões de atividade recentes da pessoa correspondente ao e-mail seed. O foco da primeira sugestão (`focus`) corresponde à meta ou à atividade recente dessa pessoa, e o campo `reason` explica o motivo. Um e-mail sem pessoa correspondente retorna um 4xx intencional (por exemplo, `404`). |

## Decisões de implementação

Registre seu plano aqui antes de editar o código.

- Decisão da camada de apresentação: usar React 19 com React Router e um cliente compartilhado em client.ts. URLs relativas /api, carregamento, vazio, sucesso e erro em cada rota; textos em português do Brasil.
- Decisão da camada de lógica: Express deve validar entradas em serviços, manter rotas em `/api/*` e retornar `4xx` para dados inválidos ou inexistentes, nunca `500` por IDs malformados.
- Decisão da camada de dados: Mongoose deve validar todos os campos exigidos e relacionar atividades, pessoas e equipes. O seed deve usar dados estáveis, `upsert` e preservar registros não relacionados.
- Abordagem para registro de atividades: validar `userId`, `teamId`, `type` e `minutes`; confirmar IDs existentes; calcular `points` e `occurredAt`; rejeitar referências inválidas sem alterar o banco.
- Abordagem para gerenciamento de equipes: exigir `name` e `mascot`, iniciar `members` como lista vazia e aceitar integrantes existentes. Criar equipe `201` e listar `200`.
- Abordagem para o placar: agregar pontos por equipe, ordenar do maior para o menor e atribuir posições iniciando em `1`.
- Abordagem para sugestões de treino: localizar a pessoa pelo e-mail seed, combinar meta ou atividade recente com o `focus` do treino e explicar o motivo. E-mail inexistente deve resultar em `4xx`.

## Plano de testes

Registre os comandos executados e o significado de cada falha.

- Testes da camada de dados: `npm run test:data --prefix octofit-tracker/backend`
- Testes da API: `npm run test:api --prefix octofit-tracker/backend`
- Testes do frontend: `npm test --prefix octofit-tracker/frontend`
- Compilação do backend: `npm run build --prefix octofit-tracker/backend`
- Compilação do frontend: `npm run build --prefix octofit-tracker/frontend`

- Manter os três comandos obrigatórios da avaliação:
    - dados: npm run test:data --prefix octofit-tracker/backend
    - API: npm run test:api --prefix octofit-tracker/backend
    - frontend: npm test --prefix octofit-tracker/frontend
- Registrar o significado da falha antes de corrigir:
    - dados: modelo, relacionamento ou seed incompleto/incorreto;
    - API: validação, resposta HTTP, serviço ou cálculo incorreto;
    - frontend: acesso à API, renderização ou estados de carregamento/vazio/erro incorretos.
- Durante a linha de base, preservar também:
    - npm test --prefix octofit-tracker/backend
    - npm test --prefix octofit-tracker/frontend
- Nas etapas seguintes, incluir:
    - npm run seed --prefix octofit-tracker/backend
    - execução repetida do seed para confirmar idempotência;
    - compilações backend e frontend;
    - verificação manual das quatro jornadas e de pelo menos uma falha visível.