# Reels Manager

Sistema de automação de publicação de Reels no Instagram via Meta Graph API oficial.

## Requisitos

- Node.js (v18+)
- PostgreSQL
- Redis (Opcional, caso migre o worker atual de polling no Postgres para BullMQ)

## Passo a Passo

### 1. Banco de Dados
Crie um banco de dados no PostgreSQL chamado `reels_manager`.

### 2. Backend

1. Entre na pasta `backend`: `cd backend`
2. Copie o `.env.example` para `.env` e preencha suas variáveis (DATABASE_URL, chaves da Meta, JWT, etc).
3. Rode `npm install` (já rodado via script).
4. Sincronize o banco: `npx prisma db push`
5. Inicie o servidor em dev: `npm run dev`

O backend iniciará na porta 3000 e o Worker de publicação iniciará automaticamente junto com ele, monitorando a fila no banco de dados.

### 3. Frontend

1. Entre na pasta `frontend`: `cd frontend`
2. Instale as dependências: `npm install` (já rodado)
3. Inicie: `npm run dev`

O frontend rodará utilizando o Vite.

## Arquitetura Implementada

- **Backend (Express)**: Recebe uploads (`multer`), gerencia as contas (`prisma`), fornece autenticação (`JWT`).
- **Worker (PublisherWorker)**: Processo em background rodando via polling (`setInterval` + `SELECT FOR UPDATE SKIP LOCKED` no Postgres) garantindo segurança contra double-posting. Publica utilizando a Meta Graph API.
- **Queue Service**: Calcula os próximos horários livres baseado nas regras (dias permitidos, janela de horário, intervalo).
- **Frontend**: Dashboard responsivo estruturado com Tailwind V4 e Vite. 

> NOTA: Para rodar localmente e permitir que a Meta publique os Reels, lembre-se de expor seu backend publicamente através do Ngrok:
> `ngrok http 3000`
> E atualizar a variável `BACKEND_URL` no `.env`.
