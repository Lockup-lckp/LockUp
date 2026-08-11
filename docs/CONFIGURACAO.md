# Guia de configuração — LCKP

Checklist para colocar a branch `reformulacao` no ar. A ordem importa.

---

## 1. Rotacionar os segredos (obrigatório)

As chaves antigas estavam commitadas no repositório, então precisam ser trocadas:

| Segredo | Onde trocar |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Painel Supabase → Settings → API → *Reset* |
| `JWT_SECRET` | Gere um novo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MP_ACCESS_TOKEN` | Painel Mercado Pago → Suas credenciais |

## 2. Variáveis de ambiente

```bash
cp Backend/.env.example Backend/.env
cp front/.env.example  front/.env
```

**`Backend/.env`** — além dos segredos rotacionados:
- `MP_WEBHOOK_SECRET` → painel Mercado Pago → **Webhooks → Assinatura secreta**
  > Sem isso o webhook **rejeita todas** as notificações (proposital). Em desenvolvimento o polling do checkout cobre o fluxo.
- `CORS_ORIGINS` → `http://localhost:5173` (some o domínio de produção quando existir)
- `BACKEND_PUBLIC_URL` → URL pública que o Mercado Pago alcança (ngrok em dev)

**`front/.env`**:
- `VITE_MERCADO_PAGO_PUBLIC_KEY` → a chave **pública** (nunca o access token)
- `VITE_API_URL` → `http://localhost:3000`

## 3. Instalar dependências

As dependências mudaram (várias removidas), então reinstale nos dois lados:

```bash
cd Backend && npm install
cd ../front && npm install
```

## 4. Banco (SQL Editor do Supabase)

Rode [`Backend/sql/2026-07-13-seguranca.sql`](../Backend/sql/2026-07-13-seguranca.sql). Ele cobre, em ordem:

1. Índice único de e-mail institucional
2. Índice único do código da escola
3. **Promover você a `superadmin`** (troque o e-mail; **mantenha o `school_id`**)
4. Conferir que todo `admin` tem `school_id` — sem isso o admin não enxerga nada
5. Configurar logo/cores/**`valor_armario`** de cada ETEC
6. Ativar RLS (defesa em profundidade)

> ⚠️ **`valor_armario` é obrigatório.** Sem ele o checkout recusa a cobrança com erro claro (antes cobrava R$ 100 fixo, errado). Confira quais escolas faltam:
> ```sql
> SELECT name, codigo, valor_armario FROM schools
>   WHERE valor_armario IS NULL OR valor_armario <= 0;
> ```

## 5. Rodar

```bash
cd Backend && npm run dev    # porta 3000
cd front   && npm run dev    # porta 5173
```

Acesse `http://localhost:5173/<codigo-da-etec>` (ex.: `/etec-bento-quirino`).

---

## Papéis (roles)

| Papel | Pode |
|---|---|
| `superadmin` | Tudo. Criar/editar/excluir instituições e campos sensíveis (`gateway_recipient_id`, `codigo`). Acessa o portal de **qualquer** escola. |
| `admin` | Gerencia **apenas a própria** escola: armários, usuários e personalização. |
| `aluno` | Aluga armários da própria escola (limite de 1). |

## Personalização por ETEC

O admin de cada escola faz sozinho: portal → menu **🎨 Personalização**.

1. Cola o **link da logo** (URL de imagem) → salva em `schools.logo_url`
2. Escolhe **cor primária / secundária / fundo** → salvam em `schools.primary_color / secondary_color / bg_color`
3. Define o **valor do armário** → `schools.valor_armario`

Ao salvar, o tema é reaplicado na hora em **todas** as telas (login, mapa, checkout, gerenciamento). Escola sem cores configuradas continua com a paleta padrão — não quebra nada.

**Como funciona por dentro:** o `EscolaProvider` (`front/src/theme/`) carrega a escola pelo código da URL e escreve as variáveis CSS `--primary-color`, `--secondary-color`, `--bg-color` e `--on-primary` no elemento raiz. Cada tela referencia esses tokens com o valor antigo como *fallback*. Para adicionar uma tela nova ao tema, basta usar `var(--primary-color, <cor-padrão>)` no CSS.

---

## Pendências conhecidas (fora do escopo da reformulação)

- **Split real por escola:** `gateway_recipient_id` está sempre nulo, então tudo cai na conta master. Habilitar exige o fluxo OAuth do Mercado Pago.
- **Painel do superadmin:** ele acessa os portais das escolas, mas não existe uma tela dedicada para gerenciar as 200+ ETECs (criar/excluir escola é via API ou SQL).
- **Policies de RLS:** o RLS está ativo como rede de segurança (deny-all para a chave anônima). Se um dia o frontend falar direto com o Supabase, será preciso escrever policies.
- **Histórico do Git:** os segredos antigos seguem em commits anteriores. A rotação (passo 1) os torna inofensivos; limpar o histórico (`git filter-repo`/BFG) é opcional.
