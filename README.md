# Test Platform

Plataforma web para criar, organizar, publicar e responder avaliações, com
geração de questões por IA a partir dos materiais do professor. O projeto
implementa a orquestração de um RAG: upload, extração, chunking hierárquico,
indexação vetorial, retrieval, reranking e proteção da entrada antes da geração.

A ingestão usa eventos, filas e Lambdas na AWS; a geração combina recuperação
no PostgreSQL, Cohere Rerank e guardrail pelo Bedrock, e OpenAI com streaming.
As etapas são controladas pela aplicação, apoiadas em serviços gerenciados de
infraestrutura e modelos.

## Estrutura

```text
.
├── api/                 # API Express, Prisma, Socket.IO e pipeline de geração
├── frontend/            # SPA Vite, React Router, upload e revisão das questões
├── api-contracts/       # Tipos de transporte consumidos por API e frontend
├── document-ingestion/  # Processors, adaptadores e handlers das Lambdas
├── infrastructure/      # Template AWS SAM, configuração e testes de IAM
└── docs/                # Análises de arquitetura e benchmarks de recuperação
```

O frontend não acessa o banco diretamente. A API concentra autenticação,
regras de negócio e persistência; `api-contracts` mantém os formatos de
requisição e resposta alinhados entre os dois aplicativos.

## Arquitetura

O fluxo tem duas partes: a ingestão transforma arquivos em trechos
recuperáveis de forma assíncrona; a geração seleciona e verifica o contexto
antes de enviar o pedido ao modelo.

```mermaid
flowchart TD
    F["Frontend — React / Vite"]
    A["API — Express / Prisma"]
    APP[(PostgreSQL da aplicação)]
    VDB[(PostgreSQL de embeddings e pais)]

    F -->|HTTP + cookie de sessão| A
    A -->|Intenção de upload e dados da aplicação| APP
    A -->|Presigned POST| F

    subgraph ING["Ingestão assíncrona"]
        S3["S3 — arquivos originais"]
        Q0["SQS — uploads recebidos"]
        L0["Lambda — confirmar upload"]
        TX["Textract — análise LAYOUT"]
        OUT["S3 — saída do Textract"]
        SNS["SNS — conclusão da análise"]
        Q1["SQS — documentos analisados"]
        L1["Lambda — layout, pais, filhos e lotes"]
        Q2["SQS — lotes de chunks"]
        L2["Lambda — gerar e persistir embeddings"]
        DDB[(DynamoDB — estado dos lotes)]
        EMB["OpenAI — embeddings dos filhos"]
        EXP["Lambda horária — reconciliar ou expirar uploads pendentes"]
        D0["DLQ — uploads"]
        D1["DLQ — documentos"]
        D2["DLQ — chunks"]

        S3 -->|ObjectCreated| Q0
        Q0 --> L0
        L0 --> TX
        TX --> OUT
        TX --> SNS
        SNS --> Q1
        Q1 --> L1
        TX -->|Resultados paginados| L1
        L1 -->|Publicar lotes| Q2
        L1 -->|Registrar lotes publicados| DDB
        Q2 --> L2
        L2 <--> DDB
        L2 --> EMB
        EMB -->|Vetores| L2
        EXP -->|Verificar existência| S3
        EXP -->|Reconciliar arquivo encontrado| L0
        Q0 -.->|Tentativas esgotadas| D0
        Q1 -.->|Tentativas esgotadas| D1
        Q2 -.->|Tentativas esgotadas| D2
    end

    F -->|Upload direto| S3
    L0 -->|UPLOADED / PROCESSING| APP
    EXP -->|Consultar pendências / marcar EXPIRED| APP
    L2 -->|Transação de pais e filhos novos| VDB
    L2 -->|Todos os lotes concluídos: PROCESSED| APP

    subgraph GEN["Geração de questões — executada pela API"]
        AUTH["Validar sessão e acesso aos materiais"]
        QE["OpenAI — embedding da consulta"]
        RET["Busca vetorial — até 40 filhos"]
        RR["Bedrock / Cohere — reranking dos filhos"]
        CTX["Expandir e deduplicar pais — até 5 / 14 mil caracteres"]
        GR["Bedrock — guardrail da mensagem final"]
        O["OpenAI Responses — geração em streaming"]
        ERR["Interromper pedido e informar erro"]

        AUTH --> QE
        QE --> RET
        RET --> RR
        RR --> CTX
        RET -.->|Reranking desativado ou falha: ordem vetorial| CTX
        CTX --> GR
        GR -->|Entrada aprovada| O
        GR -->|Ataque ou falha na avaliação| ERR
    end

    A -->|Pedido via Socket.IO| AUTH
    AUTH -->|Dono, status e lixeira| APP
    RET -->|Consulta nos documentos autorizados| VDB
    O -->|Socket.IO: texto e conclusão| F
    GR -->|Após aprovação: referências do contexto| F
    ERR -->|Socket.IO: erro de geração| F
```

O diagrama mostra o caminho com materiais selecionados. Sem materiais, a
geração pula a recuperação e avalia o pedido no guardrail antes de chamar a
OpenAI. A API também pode reconciliar um upload já presente no S3 ao receber
uma nova tentativa de preparação de upload.

A autenticação usa Google OAuth e sessão em cookie `httpOnly`. Os contratos
HTTP estão em `api-contracts/src/index.ts`; os testes de serializers cobrem a
conversão dos modelos Prisma para os DTOs expostos pela API.

### Destaques de engenharia

- **Upload com identidade e retomada:** intenção persistida antes do envio,
  SHA-256 informado pelo cliente para deduplicação por dono, chave estável e
  índice único para requisições concorrentes. A confirmação por evento S3
  permite continuar o processamento mesmo se o navegador fechar.
- **Processamento por etapas:** três filas com DLQs, respostas parciais de
  falha e Lambdas separadas para confirmação, chunking e embeddings. O
  DynamoDB acompanha o estado dos lotes e faz o claim condicional do trabalho.
- **Chunking parent-child:** extração orientada ao layout, filhos pequenos
  para busca e pais maiores para contexto, com páginas, títulos, blocos de
  origem, versão de chunking e IDs determinísticos.
- **Persistência idempotente dos chunks novos:** transação de pais e filhos
  no PostgreSQL, unicidade por documento/chunk e upsert. O caminho legado
  continua aceitando mensagens anteriores à adoção de parent-child.
- **Recuperação com orçamento:** busca limitada aos materiais autorizados,
  reranking dos filhos antes da expansão dos pais, deduplicação e limites
  configuráveis de candidatos, entradas e caracteres.
- **Políticas de falha distintas:** falha de reranking mantém a ordem
  vetorial; ataque ou falha de avaliação do guardrail interrompe a geração.
  As referências só são enviadas ao frontend depois da aprovação.
- **Interfaces e avaliação:** processors e serviços dependem de interfaces
  testáveis; o benchmark compara variantes usando os mesmos candidatos e o
  contexto efetivamente entregue à geração.
- **Infraestrutura reproduzível:** AWS SAM, parâmetros SSM, Secrets Manager,
  guardrail versionado, tracing das Lambdas e CI para código e infraestrutura.

### Garantias e limites atuais

O fluxo tolera repetições em várias etapas, mas não oferece processamento
exatamente uma vez nem recuperação automática de toda falha. A publicação
dos lotes e o registro no DynamoDB são operações separadas. O claim de lote
não tem prazo de expiração: uma Lambda encerrada abruptamente pode deixar
trabalho marcado como `processing`. O upsert dos chunks novos evita linhas
duplicadas, mas não impede chamadas repetidas ao provedor de embeddings.

As DLQs preservam mensagens que esgotaram as tentativas; o template não
implementa um consumidor de recuperação, alarmes ou atualização automática
do documento para falha terminal. A rotina horária cobre uploads pendentes,
não todos os documentos presos no restante da ingestão. Também não há limite
explícito de concorrência dos consumidores para proteger os fornecedores.

O guardrail atual cobre ataques de prompt na entrada final. Ele não valida
factualidade nem a saída gerada. As referências mostram o contexto selecionado,
sem comprovar suporte para cada afirmação produzida. O retrieval faz uma busca
por geração; recuperação iterativa está registrada como melhoria futura.

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

### Upload e ingestão dos materiais

`POST /api/upload` recebe nome, tipo, tamanho, SHA-256 e tags. A API cria ou
reutiliza uma intenção em `PENDING_UPLOAD` e retorna `NEW_UPLOAD`,
`RESUME_UPLOAD`, `ALREADY_EXISTS` ou `UPLOAD_ALREADY_COMPLETED`. O upload vai
diretamente ao S3 por presigned POST, com limite padrão de 10 MiB e validade
de 15 minutos. Retomada significa reutilizar a intenção e reenviar o arquivo;
não há retomada por intervalo de bytes.

O caminho de sucesso é `PENDING_UPLOAD → UPLOADED → PROCESSING → PROCESSED`.
A Lambda de confirmação inicia o Textract com token determinístico derivado
da chave S3. A Lambda horária verifica até 100 pendências antigas por execução:
se o objeto existe, reconcilia a confirmação; se não existe, tenta marcar
`EXPIRED`. O parâmetro SAM `PendingUploadExpirationHours` tem padrão de 24 horas.

Após a extração, o chunking versão 2 agrupa elementos por títulos, páginas e
tamanho, com objetivos de 1.500 tokens por pai e 350 por filho. Os lotes de
embeddings têm orçamento de 8.192 tokens e de aproximadamente 200 KB para
chunks e pais serializados. O modelo `text-embedding-3-small` usa 1.024
dimensões na indexação e na consulta. Metadados e chunks pais são persistidos
para expansão e rastreabilidade na recuperação.

| Consumidor | Timeout da Lambda | Visibility timeout | Mensagens por invocação |
| --- | ---: | ---: | ---: |
| Confirmação de upload | 60 s | 360 s | 10 |
| Chunking | 30 s | 120 s | 1 |
| Embeddings | 60 s | 120 s | 1 |

Cada fila principal retém mensagens por quatro dias e usa
`maxReceiveCount: 5`; suas DLQs retêm por 14 dias. Os três consumidores usam
`ReportBatchItemFailures`. Uma mensagem de embeddings pode conter vários
textos, enviados juntos ao provedor.

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

### Guardrail de entrada: ataques de prompt

A geração mantém a OpenAI e o streaming atual. Antes de gerar, a API recupera,
reranqueia e expande os trechos do RAG, monta a mensagem do professor com todo
o contexto final e chama `ApplyGuardrail` com `source: INPUT`. A avaliação
recebe exatamente a mensagem que será enviada ao modelo, incluindo cabeçalhos
de fontes e seções; as instruções internas do desenvolvedor ficam separadas.
Também há avaliação quando nenhum material é selecionado ou recuperado.

O stack cria um guardrail com **somente `PROMPT_ATTACK`**, intensidade inicial
`MEDIUM`, tier `STANDARD` e uma versão publicada. Standard é necessário para
o suporte documentado a português e utiliza processamento entre regiões da
mesma geografia. O perfil padrão é `us.guardrail.v1:0`; ajuste
`GuardrailProfileId` à geografia da região do stack. A política IAM permite
`bedrock:ApplyGuardrail` apenas no guardrail criado e nesse perfil.

Configuração via SSM em `/${Prefix}/${Environment}/guardrail/`, com variáveis
de ambiente tendo precedência:

| Variável | Parâmetro SSM | Padrão |
| --- | --- | --- |
| `INPUT_GUARDRAIL_ENABLED` | `enabled` | `true` |
| `INPUT_GUARDRAIL_REGION` | `region` | Região do stack |
| `INPUT_GUARDRAIL_IDENTIFIER` | `identifier` | ARN criado pelo stack |
| `INPUT_GUARDRAIL_VERSION` | `version` | Versão numérica publicada |
| `INPUT_GUARDRAIL_TIMEOUT_MS` | `timeout-ms` | `10000` |

Atualize a infraestrutura antes de iniciar esta versão da API. Um stack antigo
sem identificador/versão causa erro de inicialização, em vez de desativar a
proteção silenciosamente. Para desenvolvimento sem AWS, a desativação precisa
ser explícita com `INPUT_GUARDRAIL_ENABLED=false`. Os parâmetros do stack são
`InputGuardrailEnabled`, `InputGuardrailTimeoutMs`, `PromptAttackStrength` e
`GuardrailProfileId`. Ao mudar a política, atualize também a revisão na descrição
de `PromptAttackGuardrailVersion` para publicar um novo snapshot; a intensidade
e o perfil já fazem parte dessa descrição.

Ataques detectados interrompem o pedido inteiro. Timeout, indisponibilidade,
resposta incompleta, ausência do filtro de ataques ou cobertura parcial também
interrompem a geração. Nenhum trecho de referência é publicado ao frontend
antes da aprovação. O erro usa o tratamento visual existente. Não há remoção
automática de trechos, regeneração ou checagem do output nesta iteração.

Há uma chamada de guardrail por geração, sem truncamento adicional nem chamadas
por questão. O limite atual do RAG é 14.000 caracteres de contexto, além do
pedido e dos marcadores. Se o serviço rejeitar um texto por limite, a geração
falha; não passa texto não verificado ao modelo. Os logs de avaliação registram
caracteres, unidades cobradas de conteúdo, ação e latência retornada pela AWS,
sem registrar o texto avaliado. O prompt ainda é usado para embeddings e os
candidatos para reranking antes dessa checagem.

Os testes locais verificam envio integral, ordem de aprovação e interrupção em
falhas com o serviço simulado. Antes de ativar em produção, valide ataques
diretos e disfarçados nos PDFs, além de pedidos escolares legítimos em
português, para medir falsos positivos, custo e latência. A detecção reduz
injeção de instruções; não verifica a veracidade dos fatos nos materiais e
não garante eliminar todo poisoning.

Referências: [ApplyGuardrail](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html),
[ataques de prompt](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-prompt-attack.html),
[idiomas](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-supported-languages.html)
e [permissões entre regiões](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrail-profiles-permissions.html).

As permissões de reranking e guardrail ficam em `BackendBedrockPolicy`, uma
política gerenciada própria anexada ao usuário existente. Isso evita o limite
agregado de 2.048 caracteres das políticas inline de um usuário IAM; dividir
essas permissões em mais políticas inline não resolve o limite. As permissões
de armazenamento e ingestão continuam na política inline existente. A mudança
preserva ações, recursos e condições e não substitui o usuário nem suas chaves.

Além de `sam validate --lint --template-file infrastructure/template.yaml`,
execute o teste de cotas IAM antes do deploy (Python com PyYAML; dependência em
`infrastructure/test/requirements.txt`):

```bash
python3 -m unittest discover -s infrastructure/test -v
```

O teste resolve ARNs representativos, incluindo nomes de buckets com tamanho
máximo, e verifica o agregado inline, o tamanho das políticas gerenciadas e o
número de anexos definidos pelo template. Ele não consulta políticas adicionais
que tenham sido anexadas ao usuário fora do CloudFormation.

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

### Gerenciamento de materiais

Em **Meus Materiais**, é possível editar o nome e as tags, abrir ou baixar o
arquivo original e mover materiais para a **Lixeira**. A lixeira permite
restaurá-los, preservando o status de processamento. A exclusão utiliza
`deletedAt`, sem remover o arquivo ou as questões já criadas, e não exige
migração do banco. Renomear altera apenas o nome exibido; `objectKey` e
`documentId` permanecem estáveis.

Todas as operações exigem sessão e são restritas ao dono do material:

| Rota | Operação |
| --- | --- |
| `GET /api/resource` | Listar materiais ativos |
| `GET /api/resource?deleted=true` | Listar a lixeira |
| `PATCH /api/resource/:id` | Atualizar `filename` e `tags` |
| `DELETE /api/resource/:id` | Mover para a lixeira |
| `POST /api/resource/:id/restore` | Restaurar |
| `GET /api/resource/:id/file` | Obter link temporário para o original |
| `GET /api/resource/:id/file?download=true` | Obter link para download |

Links do S3 expiram em cinco minutos; links já emitidos permanecem válidos
até essa expiração. Materiais com upload pendente ou expirado não oferecem
acesso ao original. A geração via Socket.IO valida a sessão e exige que todos
os materiais selecionados pertençam ao usuário, estejam processados e fora
da lixeira.

Os cards exibem uma miniatura da primeira página de PDFs ou da imagem original,
carregada apenas quando entram na tela e mantida em cache na sessão. Arquivos
indisponíveis, formatos sem preview e falhas de renderização mantêm o ícone do
tipo de arquivo. O PDF.js e seu worker são carregados sob demanda, sem serviço
externo de preview. O CORS do bucket expõe os cabeçalhos de leitura parcial
(`Accept-Ranges`, `Content-Length`, `Content-Range`) e aceita `Range` para evitar
baixar páginas desnecessárias quando o PDF permitir.

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

O workflow [CI](.github/workflows/ci.yml) roda em pull requests e pushes na
`main`, com dois jobs independentes em paralelo:

- **Code:** testes de API, frontend e ingestão; verificação de tipos dos quatro
  pacotes; lint de API, contratos, ingestão e frontend; build de contratos,
  API e frontend.
- **Infrastructure:** validação do template SAM com `cfn-lint` e build dos
  pacotes das Lambdas com esbuild. Essas etapas não publicam recursos nem
  precisam de credenciais AWS.

Os jobs usam cache do pnpm, têm timeout de 15 minutos e cancelam execuções
anteriores da mesma branch quando chega uma nova alteração.

Para reproduzir as verificações de infraestrutura localmente, instale o AWS
SAM CLI e execute a partir da raiz, depois de `pnpm install`:

```bash
sam validate --lint --template-file infrastructure/template.yaml --region us-east-1
PATH="$PWD/document-ingestion/node_modules/.bin:$PATH" sam build --template-file infrastructure/template.yaml
```

O segundo comando disponibiliza o esbuild instalado no pacote de ingestão
para o SAM. O build das Lambdas não substitui a verificação de tipos.

### Avaliação de retrieval e reranking

O piloto usa 13 consultas sobre um capítulo de filosofia política em
português, com rótulos manuais de relevância. Compara busca vetorial e
reranking com o mesmo embedding, candidatos, expansão de pais e orçamento
de contexto. Mede Recall@5, MRR, nDCG@5, recall dos candidatos e latência;
falhas de reranking deixam o relatório incompleto, sem contar o fallback
como uma comparação válida.

```bash
pnpm run benchmark:retrieval
pnpm run benchmark:retrieval --query-style natural
```

Esses comandos fazem chamadas pagas a OpenAI e Bedrock e consultas somente
de leitura na base de embeddings. Consulte a
[metodologia e os relatórios](docs/benchmarks/README.md) antes de executá-los.

Nos relatórios completos de 28/09/2026, o reranking ficou abaixo da ordem
vetorial nas três métricas das consultas detalhadas. Nas consultas curtas,
o Recall@5 passou de 0,750 para 0,769, enquanto MRR e nDCG@5 caíram. A latência
média adicional do reranking foi de aproximadamente 1,2 segundo. O piloto
mostra resultados mistos; não é uma avaliação representativa de todos os
materiais nem mede a qualidade final das questões.
