# Test Platform

Plataforma web para criar, organizar, publicar e responder avaliações. O
monorepo reúne a aplicação React, a API Express e os contratos compartilhados
entre as duas camadas.

## Estrutura

```text
.
├── api/             # API Express, Prisma, Socket.IO e integrações externas
├── frontend/        # SPA Vite, React Router e componentes da interface
└── api-contracts/   # Tipos de transporte consumidos por API e frontend
```

O frontend não acessa o banco diretamente. A API concentra autenticação,
regras de negócio e persistência; `api-contracts` mantém os formatos de
requisição e resposta alinhados entre os dois aplicativos.

## Pré-requisitos

- Node.js 22.13 ou mais recente.
- pnpm 11 (a versão do projeto está fixada no `package.json`).
- PostgreSQL/Neon para a API.
- Credenciais do Google OAuth e OpenAI.
- Credenciais AWS com acesso ao SSM Parameter Store para iniciar a API.

## Instalação

Instale todas as dependências a partir da raiz:

```bash
pnpm install
pnpm run prisma:generate
```

Configure `api/.env` com as credenciais do backend. Para desenvolvimento
local, os valores mínimos são:

```dotenv
DATABASE_URL_POSTGRES=postgresql://usuario:senha@host/banco?sslmode=require
EMBEDDINGS_DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
OPENAI_API_KEY=
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
AWS_REGION=us-east-1
SSM_PARAMETER_PATH=/test-platform/dev
```

Antes de publicar a versão de ingestão com chunks por seção e recuperação
parent-child, execute a migração Prisma da base de embeddings. Ela usa
`EMBEDDINGS_DATABASE_URL` e fica em
[`api/prisma-embeddings/migrations`](api/prisma-embeddings/migrations):

```bash
pnpm run baseline:embeddings  # uma vez em cada base existente
pnpm run migrate:embeddings
```

A base de embeddings já existia antes de adotarmos Prisma Migrate. O primeiro
comando registra esse estado anterior como aplicado no histórico do Prisma;
ele não altera a tabela `embeddings`. Execute-o uma única vez na base
existente, depois use apenas `migrate:embeddings` nas próximas versões.

O comando `pnpm run migrate:app` usa `DATABASE_URL_POSTGRES` e as migrações da
aplicação em `api/prisma/migrations`. São bancos e históricos de migração
separados. A migração da base de embeddings preserva os registros antigos;
documentos já processados continuam com seus chunks originais até uma nova
ingestão. Publique a API e as Lambdas depois da migração, pois ambas passam a
usar as novas colunas e a tabela `embedding_parents`.

A API busca uma vez, ao iniciar, os nomes dos buckets, os ARNs de SNS e IAM
e a configuração de retrieval no SSM Parameter Store. O caminho acima corresponde aos parâmetros do stack
SAM padrão. Se `Prefix` ou `Environment` forem diferentes no deploy, ajuste
`SSM_PARAMETER_PATH` para `/<Prefix>/<Environment>`. A identidade AWS usada
pela API precisa de `ssm:GetParameters` para os parâmetros desse caminho.
Localmente, use credenciais do perfil AWS ou `AWS_ACCESS_KEY` e
`AWS_SECRET_KEY` no `api/.env`.

Configure `frontend/.env.local` com:

```dotenv
VITE_BACKEND_URL=http://localhost:8000
```

## Desenvolvimento

### Reranking do contexto

A API usa Cohere Rerank 3.5 pelo Bedrock antes de expandir os chunks filhos
para seus pais. Cada candidato é enviado como título da seção + texto do
filho. Todos os candidatos são reordenados; só depois os pais são expandidos
e deduplicados. Não há corte por score.

O SAM publica as configurações no SSM sob `SSM_PARAMETER_PATH`, nos caminhos
`rerank/{enabled,region,model-arn,timeout-ms}` e
`retrieval/{candidate-limit,max-parents,max-context-characters}`. A API lê
esses sete parâmetros em uma requisição na inicialização, além da requisição
dos recursos existentes. Alterações exigem reiniciar a API.

Os valores padrão são os abaixo. O `api/.env` pode sobrescrever cada valor do
SSM individualmente; deixe estas variáveis ausentes para usar a configuração
do stack:

```dotenv
RERANK_ENABLED=true
RERANK_REGION=us-east-1
RERANK_MODEL_ARN=arn:aws:bedrock:us-east-1::foundation-model/cohere.rerank-v3-5:0
RERANK_TIMEOUT_MS=3000
RETRIEVAL_CANDIDATE_LIMIT=40
RETRIEVAL_MAX_PARENTS=5
RETRIEVAL_MAX_CONTEXT_CHARACTERS=14000
```

Sem configuração no ambiente ou SSM, `RERANK_REGION` usa `AWS_REGION` ou
`us-east-1`, e o ARN de Cohere é construído para essa região. Ao sobrescrever
a região no ambiente, sobrescreva também o ARN se o SSM já definir um modelo
de outra região. O cliente
usa as mesmas credenciais AWS da API. `RERANK_ENABLED=false` desativa o
reranking. Valores numéricos devem ser inteiros positivos.

O SAM adiciona as permissões abaixo ao `BackendIamUser`. O ARN é construído
com os parâmetros `RerankRegion` e `RerankModelId`, também usados para o valor
publicado no SSM. Caso a API use outra identidade AWS, conceda permissões
equivalentes a ela:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "bedrock:Rerank", "Resource": "*" },
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/cohere.rerank-v3-5:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "aws-marketplace:Subscribe",
        "aws-marketplace:Unsubscribe",
        "aws-marketplace:ViewSubscriptions"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": { "aws:CalledViaLast": "bedrock.amazonaws.com" }
      }
    }
  ]
}
```

Para publicar pelo fluxo existente, a partir de `infrastructure/`:

```bash
sam build
sam deploy
```

Os parâmetros configuráveis do stack são `RerankEnabled`, `RerankRegion`,
`RerankModelId`, `RerankTimeoutMs`, `RetrievalCandidateLimit`,
`RetrievalMaxParents` e `RetrievalMaxContextCharacters`. Os padrões já
habilitam Cohere em `us-east-1`. Para personalizar, adicione os valores a
`parameter_overrides` no `samconfig.toml`, preservando `Environment` e
`Prefix`. Não é necessário recriar as chaves do usuário IAM existente.

Stacks antigos sem os novos parâmetros continuam usando os padrões, com o
aviso `Retrieval SSM parameters missing; using defaults`. Erros de acesso ao
SSM e valores inválidos impedem a inicialização, assim como a configuração
dos recursos existentes.

O Bedrock inicia automaticamente a habilitação/assinatura do modelo Cohere na
primeira chamada. O SAM concede ao `BackendIamUser` as três permissões do
Marketplace necessárias, restritas a operações intermediadas pelo Bedrock com
`aws:CalledViaLast`, seguindo a
[política oficial da AWS](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonBedrockFullAccess.html).
A invocação continua restrita ao ARN configurado por `RerankModelId` e
`RerankRegion`; a condição de Marketplace restringe o serviço intermediário,
não um produto específico. Publicar o SAM concede permissões, mas não ativa a
assinatura por si só: a primeira chamada inicia esse processo.

A conta AWS precisa ter um método de pagamento válido para o Marketplace.
Isso é configurado no faturamento da conta, fora do SAM. O formulário de
primeiro uso da Anthropic não se aplica ao Cohere. Depois do deploy, execute
`pnpm run benchmark:retrieval`. Se a habilitação ainda retornar acesso negado,
aguarde cinco minutos antes de tentar novamente, conforme a mensagem do
serviço. A primeira utilização implica aceitar os termos do fornecedor;
consulte os
[pré-requisitos oficiais](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html).
Essa integração não exige migração nem reingestão dos documentos.

Erro de acesso, indisponibilidade, resposta inválida ou timeout geram o aviso
`Reranking failed; using vector order` e a geração continua com a ordem
vetorial. A chamada é abortada ao atingir o timeout e o SDK não faz retries
automáticos. O fallback também cobre a ausência de um ranking completo.
Limites do Bedrock (até 1000 fontes por requisição e limites de texto) se
aplicam ao adaptador; a contagem de unidades faturadas depende do volume dos
trechos, conforme a [tabela de preços AWS](https://aws.amazon.com/bedrock/pricing/).

O retrieval consome a interface `Reranker`, independente de AWS/Cohere. O
adaptador AWS fica em `api/src/questions/adapters/bedrock-reranker.ts` e é
construído apenas no ponto de composição da API. Para chamadas internas,
`generator.retrieveContext(documents, query, options)` retorna contexto e
referências, sem gerar questões. `getChunks` aceita os mesmos parâmetros;
`generateQuestion` aceita as opções como quinto argumento. Os limites por
chamada não alteram os padrões das chamadas seguintes, permitindo que um
futuro agente ajuste a recuperação. O limite de caracteres inclui os
cabeçalhos de fonte; pais que não cabem são pulados para tentar aproveitar
outros candidatos. Trechos legados também contam no limite de pais/trechos.

Para executar os testes locais (sem chamadas reais ao Bedrock):

```bash
pnpm run test:api
pnpm run typecheck:api
```

### Iniciar as aplicações

Inicie a stack completa de desenvolvimento a partir da raiz:

```bash
pnpm dev
```

Esse comando gera os contratos e o Prisma e sobe a API e o frontend em
paralelo. A API reinicia automaticamente ao salvar arquivos importados.
`Ctrl+C` encerra as duas aplicações.

Para executar somente uma aplicação:

```bash
pnpm run dev:api
pnpm run dev:frontend
```

A API fica disponível em `http://localhost:8000` e o frontend em
`http://localhost:5173`.

## Qualidade

Os comandos abaixo executam as validações do monorepo:

```bash
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run build
```

O build do pacote `api-contracts` acontece antes dos consumidores para que os
tipos gerados estejam disponíveis tanto para a API quanto para o frontend.

## Arquitetura

```mermaid
flowchart LR
    U[Usuário] --> F[Frontend\nVite + React]
    F -->|HTTP + cookie| A[API\nExpress]
    F <-->|Socket.IO| A
    A --> D[PostgreSQL / Neon\nPrisma]
    A --> O[OpenAI]
    A --> S[Amazon S3 / Textract]
```

A autenticação usa Google OAuth e sessão em cookie `httpOnly`. Os contratos
HTTP estão em `api-contracts/src/index.ts`; os testes de serializers cobrem a
conversão dos modelos Prisma para os DTOs expostos pela API.
