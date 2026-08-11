# LCKP — Sistema de Locação de Armários

Plataforma multi-escola (multi-tenant) onde alunos alugam armários físicos da própria instituição de ensino. Cada escola (ETEC) tem seu conjunto de armários, identidade visual e alunos vinculados.

## Stack
- **Frontend:** React (Vite) + React Router
- **Backend:** Node.js + Express, autenticação via JWT
- **Banco:** Supabase (Postgres)
- **Pagamentos:** Mercado Pago (token do cartão no front, cobrança no back)

## Estrutura
```
Backend/   API Express (rotas, controladores, middlewares)
front/     Aplicação React (screens, components, services)
```

## Configuração
1. **Backend:** copie `Backend/.env.example` para `Backend/.env` e preencha os valores.
2. **Frontend:** copie `front/.env.example` para `front/.env` e preencha os valores.
3. **Nunca** commite arquivos `.env` — eles estão no `.gitignore`.

## Rodando
```bash
# Backend
cd Backend && npm install && npm run dev

# Frontend
cd front && npm install && npm run dev
```

## Papéis (roles)
- **superadmin** — dono da plataforma. Cria/edita/exclui instituições e campos sensíveis (recebedor de pagamento).
- **admin** — administrador de uma escola. Gerencia apenas armários, usuários e a personalização da própria instituição.
- **aluno** — aluga armários da própria escola.

## Segurança
- Segredos ficam apenas em variáveis de ambiente no backend.
- Toda rota de dados exige token JWT; o escopo por escola é forçado no servidor (nunca confia em `school_id` vindo do cliente).
- O webhook do Mercado Pago valida a assinatura HMAC antes de processar.
