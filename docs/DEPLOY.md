# 🚀 Guia de Deploy - LCKP

Este documento descreve como fazer deploy do frontend (Vercel) e do backend
(Render ou VPS). **Nunca** commite valores reais de secrets — use os paineis
de variaveis de ambiente de cada plataforma.

---

## 1. Frontend -> Vercel

O frontend fica em `front/` (React + Vite) e ja possui `vercel.json` com as
rewrites de SPA. O deploy de producao acontece automaticamente a cada push na
branch `main`.

### Configuracao do projeto na Vercel
- **Root Directory:** `front`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Variaveis de ambiente (Vercel > Settings > Environment Variables)
Defina as variaveis do frontend (ver `front/.env.example`), por exemplo a URL
publica da API do backend. Lembre-se: no frontend so entram valores publicos.

### Deploy via GitHub Actions (opcional)
Existe um workflow em `.github/workflows/deploy.yml` que usa a action da Vercel.
Ele precisa dos secrets do repositorio (Settings > Secrets and variables > Actions):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

> Como a Vercel ja esta conectada ao repo via a integracao nativa, esse workflow
> e redundante. Escolha **um** dos dois metodos (integracao nativa OU Action)
> para evitar deploys duplicados.

---

## 2. Backend -> Render

O backend fica em `Backend/` (Node + Express). O arquivo `render.yaml` na raiz
descreve o servico como blueprint.

### Passo a passo
1. No Render: **New +** > **Blueprint**.
2. Conecte o repositorio `Lockup-lckp/LockUp`.
3. O Render le o `render.yaml` automaticamente (Root Directory = `Backend`).
4. Preencha as variaveis marcadas como `sync: false` no painel:
   - `CORS_ORIGINS` (ex: `https://www.lckp.com.br`)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `BACKEND_PUBLIC_URL`
5. Clique em **Apply** e aguarde o deploy.

> No plano Free o servico hiberna apos inatividade (cold start de ~50s).

---

## 3. Backend -> VPS (Hostinger / AWS) - alternativa

Caso prefira rodar o backend numa VPS em vez do Render:

1. Instale Node.js 20+ e o PM2: `npm install -g pm2`.
2. Clone o repo e entre em `Backend/`.
3. Crie o arquivo `.env` a partir de `.env.example` (com os valores reais).
4. Instale dependencias e suba com PM2:
   ```bash
   npm install
   pm2 start src/server.js --name lockup-backend
   pm2 save
   ```
5. Configure um proxy reverso (Nginx) apontando para a porta do backend e
   habilite HTTPS (ex: Certbot/Let's Encrypt).
6. Ajuste `CORS_ORIGINS` para o dominio do frontend e `BACKEND_PUBLIC_URL`
   para a URL publica da VPS (necessario para o webhook do Mercado Pago).

---

## 4. Checklist de seguranca antes de ir a producao

- [ ] Nenhum arquivo `.env` real commitado no Git.
- [ ] Secrets configurados apenas nos paineis (Vercel/Render) ou no `.env` da VPS.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` usada **somente** no backend.
- [ ] Se alguma credencial ja vazou no historico do Git, **rotacione-a**.
- [ ] CORS restrito aos dominios corretos em producao.
