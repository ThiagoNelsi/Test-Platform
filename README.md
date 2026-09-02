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
- AWS opcional para upload e processamento de materiais.

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
```

Configure `frontend/.env.local` com:

```dotenv
VITE_BACKEND_URL=http://localhost:8000
```

## Desenvolvimento

Inicie a stack completa de desenvolvimento a partir da raiz:

```bash
pnpm dev
```

Esse comando gera os contratos e o Prisma e sobe a API e o frontend em
paralelo. `Ctrl+C` encerra as duas aplicações.

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
