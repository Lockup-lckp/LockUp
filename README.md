# 🔒 LCKP — Lockup Ecosystem

Repositorio central do projeto **Lockup (LCKP)** — ecossistema e plataforma de locacao de armarios escolares.

## 🗂️ Estrutura do Projeto

- `front/`: Interface web (React 19 + Vite + Tailwind). Deploy na **Vercel**.
- `Backend/`: API e regras de negocio (Node.js + Express + Supabase). Deploy no **Render** (ou VPS).
- `docs/`: Documentacao do projeto (configuracao, deploy, etc.).
- `.github/`: Automacoes de CI/CD, template de Pull Request e diretrizes do repositorio.

## 🚀 Como Executar Localmente

### Pre-requisitos
- Node.js (v18+)
- Git
- Conta no Supabase (para o backend)

### Frontend (`front/`)
```bash
cd front
cp .env.example .env   # preencha as variaveis
npm install
npm run dev            # http://localhost:5173
```

### Backend (`Backend/`)
```bash
cd Backend
cp .env.example .env   # preencha SUPABASE_URL, JWT_SECRET, etc.
npm install
npm run dev            # porta definida em PORT (padrao 3000)
```

> As variaveis de ambiente necessarias estao documentadas nos arquivos `.env.example` de cada pasta. **Nunca** commite arquivos `.env` com valores reais.

## 🌿 Fluxo de Trabalho (Branches e PR)

1. Atualize a branch base: `git checkout develop && git pull origin develop`
2. Crie uma branch: `git checkout -b feature/nome-da-sua-tarefa`
3. Faca commits claros (Conventional Commits): `feat(modulo): descricao clara`
4. Envie e abra o Pull Request para `develop`: `git push -u origin feature/nome-da-sua-tarefa`
5. Preencha o template de PR e aguarde a revisao da equipe.

## 📦 Deploy

- **Frontend** → Vercel (build automatico a cada push na `main`).
- **Backend** → Render (blueprint em `render.yaml`) ou VPS.

Passo a passo completo em [`docs/DEPLOY.md`](docs/DEPLOY.md).

## 🔗 Links

- Site: https://www.lckp.com.br/
- Board de tarefas: aba **Projects** da organizacao
