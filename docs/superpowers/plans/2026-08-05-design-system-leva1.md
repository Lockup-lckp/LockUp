# LCKP Leva 1 — Design System e Experiência Visual: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar as três identidades visuais do LCKP numa só — a da landing — e entregar o mapa de armários e o checkout usáveis no celular.

**Architecture:** A paleta da landing vira um módulo compartilhado (`marca.js`) consumido tanto pela própria landing quanto pelos tokens CSS padrão. `index.css` ganha uma escala completa de tokens e um vocabulário de classes `.lckp-*` que replicam as formas da landing. As ~20 telas trocam cor literal por token. A Home do aluno perde a sidebar de detalhes para um modal.

**Tech Stack:** React 19, React Router 7, Vite 8, Tailwind CSS 4 (via `@tailwindcss/vite`), CSS custom properties. Sem TypeScript, sem framework de teste.

## Global Constraints

- **Não existe suíte de testes neste projeto.** `package.json` expõe apenas `dev`, `build`, `lint`, `preview`. Os portões de verificação são `npm run build`, `npx eslint <arquivos tocados>`, asserções por `grep` e inspeção visual no browser. **Não crie infraestrutura de teste** — está fora do escopo desta leva.
- **`npm run lint` NÃO passa nesta base.** Baseline medido em 2026-08-05, antes de qualquer alteração: **29 erros e 2 avisos** pré-existentes, majoritariamente `react-hooks/set-state-in-effect` e `react-refresh/only-export-components`, em `theme/EscolaContext.jsx`, `services/authService.js` e 8 telas `index.jsx` (incluindo 3 em `screens/Landing/index.jsx`). Corrigi-los está **fora do escopo** desta leva. O portão de cada task é `npx eslint` nos arquivos tocados, comparando contra este baseline: **nenhum erro novo**. Onde o plano disser "`npm run lint && npm run build`", ler como "`npx eslint <arquivos da task> && npm run build`".
- Todos os comandos rodam a partir de `C:\Users\PH\Desktop\rede-compras\front`.
- **Nenhum arquivo em `Backend/` pode ser tocado.** A Leva 1 não altera API, contrato ou tabela. Existe uma alteração não commitada do usuário em `Backend/src/controladores/pagamentosControlador.js` — não incluir em commit nenhum.
- Idioma do código: **português**. Nomes de variáveis, funções, comentários e texto de interface em português, seguindo o padrão existente (`armarioSelecionado`, `carregando`, `escola`).
- Comentários explicam **por quê**, não o quê — seguindo a densidade já praticada no repositório.
- Paleta LCKP, valores exatos: navy `#0A1F44`, navy profundo `#06122B`, superfície `#0D2A52`, dourado `#E8B44A`, dourado profundo `#C8912E`, dourado suave `rgba(232,180,74,0.14)`, sucesso `#3DDC97`, erro `#EF4444`.
- Paleta legada a ser eliminada: `#0b0f19`, `#111827`, `#f19b33`, `#b96f1e`, `#00d2ff`.
- Breakpoints: mobile `375px`, tablet `768px`, desktop `1280px`.
- Commitar ao fim de cada task. Nunca usar `--no-verify`.

---

## Estrutura de arquivos

**Criados**

| Arquivo | Responsabilidade única |
|---|---|
| `front/src/theme/marca.js` | Constantes da marca LCKP. Sem dependências, sem lógica. |
| `front/src/theme/bloquearZoom.js` | Ativação/desativação do bloqueio de zoom, isolada atrás de uma constante. |
| `front/src/components/ModalArmario.jsx` | Diálogo de confirmação de armário selecionado. |

**Modificados:** `index.html`, `main.jsx`, `index.css`, `theme/aplicarTema.js`, `screens/Landing/index.jsx`, `screens/SuperAdmin/index.jsx`, `screens/Home/index.jsx`, `screens/Checkout/{index.jsx,Checkout.css}`, `screens/HomeAdmin/{index.jsx,HomeAdmin.css}`, `screens/Auth/{index.jsx,AlterarSenha.jsx,Login.css}`, `screens/Gerenciamento/Usuarios/{index.jsx,Gerenciamento.css}`, `screens/Gerenciamento/Armarios/index.jsx`, `screens/Gerenciamento/Historico/index.jsx`, `screens/MeuArmario/index.jsx`, `screens/Personalizacao/{index.jsx,Personalizacao.css}`, `components/{NavBar,SideBar,SideBarAdmin,ProtectedRoute}.jsx`, `router.jsx`.

---

### Task 1: Fonte única da marca

Hoje a landing declara `const NAVY = '#0A1F44'` e `const GOLD = '#E8B44A'` localmente e as usa 30 vezes. Enquanto essas cores forem constantes locais, nenhuma outra tela pode herdá-las. Esta task extrai a paleta sem mudar um pixel da landing.

**Files:**
- Create: `front/src/theme/marca.js`
- Modify: `front/src/screens/Landing/index.jsx:11-16` (bloco `── PALETA PROFISSIONAL ──`)

**Interfaces:**
- Produces: `MARCA` — objeto congelado com as chaves `navy`, `navyDeep`, `surface`, `gold`, `goldDeep`, `goldSoft`, `sucesso`, `erro`, todas `string`. Consumido pela Task 2 (`aplicarTema.js`) e pela Task 12 (`SuperAdmin`).

- [ ] **Step 1: Criar o módulo da marca**

```js
// front/src/theme/marca.js

// Paleta da marca LCKP, extraída da landing page — que é a referência visual
// do produto. Isto é a ÚNICA definição das cores da marca: a landing importa
// daqui, e aplicarTema.js usa estes mesmos valores como tema padrão de escola.
// Antes, a landing declarava as cores localmente e nenhuma outra tela conseguia
// herdá-las, o que produziu três identidades visuais paralelas no sistema.
export const MARCA = Object.freeze({
  navy: '#0A1F44',
  navyDeep: '#06122B',
  surface: '#0D2A52',
  gold: '#E8B44A',
  goldDeep: '#C8912E',
  goldSoft: 'rgba(232,180,74,0.14)',
  sucesso: '#3DDC97',
  erro: '#EF4444'
});
```

- [ ] **Step 2: Apontar a landing para o módulo**

Em `front/src/screens/Landing/index.jsx`, substituir o bloco de constantes (linhas 11-16) por:

```js
import { MARCA } from '../../theme/marca.js';

// ── PALETA PROFISSIONAL ──
// Reexportadas como locais para não reescrever os 30 pontos de uso do arquivo.
const NAVY = MARCA.navy;
const NAVY_DEEP = MARCA.navyDeep;
const GOLD = MARCA.gold;
const GOLD_SOFT = MARCA.goldSoft;
const SUCESSO = MARCA.sucesso;
```

O `import` vai junto dos demais imports no topo do arquivo, não no meio.

- [ ] **Step 3: Verificar que os valores não mudaram**

Run: `grep -n "const NAVY\|const GOLD\|const SUCESSO" src/screens/Landing/index.jsx`
Expected: cinco constantes, todas atribuídas a partir de `MARCA.*`, nenhuma com literal hexadecimal.

- [ ] **Step 4: Build e lint**

Run: `npm run lint && npm run build`
Expected: ambos passam sem erro.

- [ ] **Step 5: Confirmar que a landing está visualmente idêntica**

Run: `npm run dev`, abrir `http://localhost:5173/` no browser em 1280px.
Expected: hero navy, botões dourados, cards de armário — nenhuma diferença perceptível em relação a antes. Esta task é puramente uma extração.

- [ ] **Step 6: Commit**

```bash
git add front/src/theme/marca.js front/src/screens/Landing/index.jsx
git commit -m "refactor: extrai paleta da marca da landing para theme/marca.js"
```

---

### Task 2: Escala de tokens e derivação de tema

`index.css` define 6 tokens e assume fundo escuro. `--box-bg` é `rgba(17,24,39,.6)` fixo, então uma escola que escolha fundo claro fica com cards escuros e texto ilegível — bug real hoje em produção. Esta task troca a paleta padrão para a da marca e faz a escala inteira ser derivada das 3 cores que a escola configura.

**Files:**
- Modify: `front/src/index.css:15-22` (bloco `:root`)
- Modify: `front/src/theme/aplicarTema.js` (todo o arquivo)

**Interfaces:**
- Consumes: `MARCA` da Task 1.
- Produces: os tokens CSS `--primary-color`, `--secondary-color`, `--bg-color`, `--surface-color`, `--surface-raised`, `--border-color`, `--on-primary`, `--on-bg`, `--on-bg-muted`, `--success`, `--danger`, `--radius-card`, `--radius-control`, `--shadow-panel`. Consumidos por todas as tasks seguintes. `--box-bg` permanece como alias de `--surface-color` até a Task 13.
- Produces: `PADRAO` — objeto `{ primary, secondary, bg }`, já exportado hoje e consumido por `screens/Personalizacao/index.jsx:5`. **A forma não muda**, só os valores.

- [ ] **Step 1: Substituir o `:root` de `index.css`**

Trocar o bloco atual (linhas 15-22) por:

```css
/* Tokens de marca padrão, alinhados à landing (ver theme/marca.js).
   O EscolaProvider sobrescreve estes valores por escola, em tempo de execução,
   no elemento raiz. Cada tela referencia estes tokens com um fallback, então uma
   escola sem cores configuradas mantém o visual padrão da marca. */
:root {
  --primary-color: #E8B44A;
  --secondary-color: #C8912E;
  --bg-color: #0A1F44;
  --surface-color: #0D2A52;
  --surface-raised: #123362;
  --border-color: rgba(255, 255, 255, 0.10);
  --on-primary: #0A1F44;
  --on-bg: #ffffff;
  --on-bg-muted: rgba(255, 255, 255, 0.55);
  --success: #3DDC97;
  --danger: #EF4444;

  --radius-card: 16px;
  --radius-control: 10px;
  --shadow-panel: 0 30px 60px -15px rgba(0, 0, 0, 0.6);

  /* Alias temporário: telas ainda não convertidas consomem --box-bg.
     Removido na Task 13, quando a última tela migrar. */
  --box-bg: var(--surface-color);
}
```

- [ ] **Step 2: Reescrever `aplicarTema.js` para derivar a escala**

```js
// Camada de tema por escola: aplica as cores da instituição como variáveis CSS
// no elemento raiz, de modo que TODAS as telas (não só o login) herdem a paleta.
// Cada tela referencia esses tokens com um fallback, então uma escola sem cores
// configuradas continua com o visual padrão (zero regressão).

import { MARCA } from './marca.js';

// Exportado para a tela de Personalização poder oferecer "voltar ao padrão" por cor.
export const PADRAO = {
  primary: MARCA.gold,
  secondary: MARCA.goldDeep,
  bg: MARCA.navy
};

// Luminância relativa aproximada (0 = escuro, 1 = claro) para decidir se o texto
// sobre a cor primária deve ser claro ou escuro (contraste legível).
const luminancia = (hex) => {
  if (!hex || typeof hex !== 'string') return 0;
  const limpo = hex.replace('#', '').trim();
  const full = limpo.length === 3 ? limpo.split('').map((c) => c + c).join('') : limpo;
  if (full.length !== 6) return 0;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const aplicarTemaEscola = (escola) => {
  const root = document.documentElement;
  const primary = escola?.primary_color || PADRAO.primary;
  const secondary = escola?.secondary_color || PADRAO.secondary;
  const bg = escola?.bg_color || PADRAO.bg;

  const onPrimary = luminancia(primary) > 0.6 ? '#0b0f19' : '#ffffff';
  // Texto legível sobre a cor de fundo escolhida pela escola: se a escola optar por um
  // fundo claro (ex: branco), o texto vira escuro em vez de continuar fixo em branco.
  const fundoClaro = luminancia(bg) > 0.6;
  const onBg = fundoClaro ? '#0b0f19' : '#ffffff';

  // Superfícies e bordas DERIVADAS do fundo, não fixas. Antes, --box-bg era um
  // cinza-escuro literal: uma escola com fundo claro ficava com cards escuros e
  // texto invisível. Clarear um fundo escuro (ou escurecer um claro) mantém o
  // contraste de painel em qualquer paleta que a escola escolher.
  const mistura = fundoClaro ? '#000000' : '#ffffff';
  const surface = `color-mix(in srgb, ${bg} 92%, ${mistura})`;
  const surfaceRaised = `color-mix(in srgb, ${bg} 84%, ${mistura})`;
  const border = fundoClaro ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)';
  const onBgMuted = fundoClaro ? 'rgba(11,15,25,0.60)' : 'rgba(255,255,255,0.55)';

  root.style.setProperty('--primary-color', primary);
  root.style.setProperty('--secondary-color', secondary);
  root.style.setProperty('--bg-color', bg);
  root.style.setProperty('--surface-color', surface);
  root.style.setProperty('--surface-raised', surfaceRaised);
  root.style.setProperty('--border-color', border);
  root.style.setProperty('--on-primary', onPrimary);
  root.style.setProperty('--on-bg', onBg);
  root.style.setProperty('--on-bg-muted', onBgMuted);
};

export const resetarTema = () => {
  aplicarTemaEscola(null);
};
```

- [ ] **Step 3: Build e lint**

Run: `npm run lint && npm run build`
Expected: ambos passam.

- [ ] **Step 4: Verificar a mudança de paleta no browser**

Run: `npm run dev`, abrir `http://localhost:5173/etec-043` (ou qualquer código de escola existente).
Expected: o fundo do sistema muda de quase-preto (`#0b0f19`) para navy (`#0A1F44`) e os destaques de âmbar para dourado. Telas ainda não convertidas vão parecer inconsistentes — isso é esperado, elas serão convertidas nas tasks 5 a 12.

- [ ] **Step 5: Verificar o cenário de fundo claro**

No browser, com sessão de admin, abrir Personalização e definir a cor de fundo como `#FFFFFF`. Salvar.
Expected: os cards ficam claros e o texto escuro — legível. Antes desta task, os cards continuariam cinza-escuros. Restaurar o fundo para `#0A1F44` ao terminar.

- [ ] **Step 6: Commit**

```bash
git add front/src/index.css front/src/theme/aplicarTema.js
git commit -m "feat: escala completa de tokens derivada do tema da escola"
```

---

### Task 3: Vocabulário de componentes

Os 5 CSS de tela somam 1.351 linhas repetindo card, input, botão, tabela e chip com cores literais. Esta task define as formas uma vez, copiadas da landing, para as tasks seguintes consumirem. Nada muda visualmente ainda — nenhuma tela usa estas classes até a Task 5.

**Files:**
- Modify: `front/src/index.css` (acrescentar ao final)

**Interfaces:**
- Consumes: os tokens da Task 2.
- Produces: as classes `.lckp-card`, `.lckp-btn`, `.lckp-btn--ghost`, `.lckp-btn--danger`, `.lckp-input`, `.lckp-label`, `.lckp-table`, `.lckp-chip`, `.lckp-chip--success`, `.lckp-chip--danger`, `.lckp-chip--muted`, `.lckp-modal__backdrop`, `.lckp-modal`. Consumidas pelas tasks 5 a 12.

- [ ] **Step 1: Acrescentar o vocabulário ao final de `index.css`**

```css
/* ==================================================================
   Vocabulário de componentes LCKP
   As formas são as da landing (borda translúcida, superfície suave,
   cantos generosos, brilho no hover, recuo no clique). As cores vêm
   sempre de token, nunca literal, para o tema da escola alcançá-las.
   ================================================================== */

.lckp-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-panel);
  color: var(--on-bg);
}

.lckp-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--on-bg-muted);
  margin-bottom: 0.375rem;
}

.lckp-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-control);
  padding: 0.625rem 0.875rem;
  color: var(--on-bg);
  font-family: inherit;
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.15s ease;
}
.lckp-input::placeholder { color: var(--on-bg-muted); }
.lckp-input:focus { border-color: var(--primary-color); }
.lckp-input:disabled { opacity: 0.55; cursor: not-allowed; }

.lckp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--primary-color);
  color: var(--on-primary);
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  padding: 0.75rem 1.5rem;
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.1s ease;
}
.lckp-btn:hover:not(:disabled) { filter: brightness(1.1); }
.lckp-btn:active:not(:disabled) { transform: scale(0.98); }
.lckp-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.lckp-btn--ghost {
  background: transparent;
  color: var(--on-bg);
  border-color: var(--border-color);
}
.lckp-btn--ghost:hover:not(:disabled) {
  background: color-mix(in srgb, var(--on-bg) 8%, transparent);
  filter: none;
}

.lckp-btn--danger {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 40%, transparent);
}
.lckp-btn--danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 20%, transparent);
  filter: none;
}

.lckp-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
.lckp-table thead tr { border-bottom: 1px solid var(--border-color); }
.lckp-table th {
  padding: 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--on-bg-muted);
  white-space: nowrap;
}
.lckp-table td { padding: 0.75rem; }
.lckp-table tbody tr + tr { border-top: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent); }

.lckp-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--on-bg) 6%, transparent);
  color: var(--on-bg-muted);
}
.lckp-chip--success {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 35%, transparent);
  background: color-mix(in srgb, var(--success) 12%, transparent);
}
.lckp-chip--danger {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 35%, transparent);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}
.lckp-chip--muted { opacity: 0.7; }

.lckp-modal__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.lckp-modal {
  width: 100%;
  max-width: 26rem;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-panel);
  color: var(--on-bg);
  overflow: hidden;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: passa. Tailwind 4 compila `color-mix` sem problema — ele é CSS nativo, não uma diretiva do Tailwind.

- [ ] **Step 3: Confirmar que nada mudou visualmente**

Run: `npm run dev`, conferir qualquer tela.
Expected: nenhuma diferença. As classes existem mas ninguém as consome ainda.

- [ ] **Step 4: Commit**

```bash
git add front/src/index.css
git commit -m "feat: vocabulario de componentes .lckp-* baseado nas formas da landing"
```

---

### Task 4: Bloqueio de zoom reversível

Pedido explícito do usuário. Isolado atrás de uma constante única porque viola WCAG 1.4.4 e a decisão pode ser revertida depois de ver o resultado responsivo das tasks 7 e 8.

**Files:**
- Create: `front/src/theme/bloquearZoom.js`
- Modify: `front/index.html:6` (meta viewport)
- Modify: `front/src/main.jsx`

**Interfaces:**
- Produces: `BLOQUEAR_ZOOM` (`boolean`) e `aplicarBloqueioZoom()` (`() => void`). Chamado uma vez em `main.jsx`.

- [ ] **Step 1: Criar o módulo**

```js
// front/src/theme/bloquearZoom.js

// Bloqueio de zoom do sistema, pedido explicitamente pelo usuário para o layout
// não "ficar esquisito" em telas pequenas.
//
// ATENÇÃO: isto viola o critério WCAG 1.4.4 (Resize Text) e prejudica usuários
// com baixa visão — inclusive alunos. A responsividade do checkout e do mapa de
// armários resolve o problema estético por conta própria, então este bloqueio é
// opcional na prática. Está isolado atrás da constante abaixo justamente para
// que desligá-lo seja trocar um booleano, sem tocar em mais nada.
export const BLOQUEAR_ZOOM = true;

const impedir = (evento) => evento.preventDefault();

export function aplicarBloqueioZoom() {
  if (!BLOQUEAR_ZOOM) return;

  // iOS ignora user-scalable=no na meta tag desde o iOS 10; a única forma de
  // impedir o pinça-para-ampliar por lá é cancelar os eventos de gesto.
  document.addEventListener('gesturestart', impedir, { passive: false });
  document.addEventListener('gesturechange', impedir, { passive: false });
  document.addEventListener('gestureend', impedir, { passive: false });

  // Zoom por Ctrl + roda do mouse (desktop).
  document.addEventListener(
    'wheel',
    (evento) => {
      if (evento.ctrlKey) evento.preventDefault();
    },
    { passive: false }
  );

  // Duplo-toque para ampliar: dois toques em menos de 300ms.
  let ultimoToque = 0;
  document.addEventListener(
    'touchend',
    (evento) => {
      const agora = Date.now();
      if (agora - ultimoToque <= 300) evento.preventDefault();
      ultimoToque = agora;
    },
    { passive: false }
  );
}
```

- [ ] **Step 2: Ajustar o meta viewport**

Em `front/index.html`, trocar a linha 6 por:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

- [ ] **Step 3: Chamar no bootstrap**

Em `front/src/main.jsx`, acrescentar o import junto dos demais e a chamada antes do `createRoot(...).render(...)`:

```js
import { aplicarBloqueioZoom } from './theme/bloquearZoom.js';

aplicarBloqueioZoom();
```

- [ ] **Step 4: Build e lint**

Run: `npm run lint && npm run build`
Expected: ambos passam.

- [ ] **Step 5: Verificar no browser**

Run: `npm run dev`, abrir qualquer tela em 1280px e tentar `Ctrl` + roda do mouse.
Expected: a página não amplia. O scroll normal (sem Ctrl) continua funcionando — se o scroll travar, o `evento.ctrlKey` foi omitido.

- [ ] **Step 6: Commit**

```bash
git add front/index.html front/src/main.jsx front/src/theme/bloquearZoom.js
git commit -m "feat: bloqueio de zoom isolado atras da constante BLOQUEAR_ZOOM"
```

---

### Task 5: Chrome compartilhado — NavBar, SideBar, SideBarAdmin, router, ProtectedRoute

Componentes pequenos que aparecem em todas as telas. Convertê-los primeiro dá retorno visual imediato e valida os tokens antes das telas grandes.

**Files:**
- Modify: `front/src/components/NavBar.jsx:23,38,47`
- Modify: `front/src/components/SideBar.jsx`
- Modify: `front/src/components/SideBarAdmin.jsx`
- Modify: `front/src/components/ProtectedRoute.jsx`
- Modify: `front/src/router.jsx`

**Interfaces:**
- Consumes: tokens da Task 2, classes da Task 3.
- Produces: nada consumido por outras tasks.

- [ ] **Step 1: Localizar as cores literais**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/components/*.jsx src/router.jsx`
Expected: 5 ocorrências (NavBar 1, SideBar 1, SideBarAdmin 1, ProtectedRoute 2, router 2).

- [ ] **Step 2: Aplicar a tabela de conversão**

Em cada ocorrência encontrada, substituir conforme:

| Literal | Substituto |
|---|---|
| `bg-[#0b0f19]` | `bg-[var(--bg-color)]` |
| `bg-[#111827]/80` e variantes | `bg-[var(--surface-color)]/80` |
| `text-[#f19b33]` | `text-[var(--primary-color)]` |
| `from-[#f19b33] to-[#b96f1e]` | `from-[var(--primary-color)] to-[var(--secondary-color)]` |
| `border-white/10` | `border-[var(--border-color)]` |
| `text-gray-400` / `text-gray-300` | `text-[var(--on-bg-muted)]` |
| `text-white` | `text-[var(--on-bg)]` |

Em `NavBar.jsx:23`, `border-b border-[var(--primary-color)]/30` já usa token e fica como está.

- [ ] **Step 3: Confirmar que não sobrou literal**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/components/*.jsx src/router.jsx`
Expected: nenhuma saída.

- [ ] **Step 4: Build, lint e conferência visual**

Run: `npm run lint && npm run build && npm run dev`
Expected: navbar e sidebar em navy com destaques dourados, coerentes com a landing. Abrir o menu lateral e conferir hover e estado ativo.

- [ ] **Step 5: Commit**

```bash
git add front/src/components front/src/router.jsx
git commit -m "style: converte chrome compartilhado para os tokens de marca"
```

---

### Task 6: Autenticação — Login, Alterar Senha

**Files:**
- Modify: `front/src/screens/Auth/Login.css` (6 literais)
- Modify: `front/src/screens/Auth/index.jsx` (1 literal)
- Modify: `front/src/screens/Auth/AlterarSenha.jsx`

- [ ] **Step 1: Localizar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/Auth/*`
Expected: 7 ocorrências.

- [ ] **Step 2: Converter**

Aplicar a mesma tabela de conversão da Task 5, Step 2. Em `Login.css`, trocar as declarações CSS literais (`background: #0b0f19` → `background: var(--bg-color)`, `color: #f19b33` → `color: var(--primary-color)`, etc.). Onde houver card de formulário, aplicar `.lckp-card`; onde houver campo, `.lckp-input`; no botão de submit, `.lckp-btn`.

- [ ] **Step 3: Confirmar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/Auth/`
Expected: nenhuma saída.

- [ ] **Step 4: Build, lint e conferência visual em dois tamanhos**

Run: `npm run lint && npm run build && npm run dev`
Abrir `/etec-043` em 1280px e em 375px.
Expected: card de login navy com borda translúcida, botão dourado com texto navy, campo com foco dourado. Sem scroll horizontal em 375px.

- [ ] **Step 5: Verificar o fluxo de troca de senha**

Logar com um usuário que tenha `precisa_alterar_senha = true`.
Expected: a tela de alteração de senha aparece com o mesmo tratamento visual.

- [ ] **Step 6: Commit**

```bash
git add front/src/screens/Auth
git commit -m "style: converte telas de autenticacao para os tokens de marca"
```

---

### Task 7: Home do aluno — popup de armário e matriz responsiva

A maior mudança de comportamento da leva. A sidebar de detalhes sai e um modal assume o papel dela.

**Files:**
- Create: `front/src/components/ModalArmario.jsx`
- Modify: `front/src/screens/Home/index.jsx:125-257`
- Modify: `front/src/screens/HomeAdmin/HomeAdmin.css` (matriz responsiva; a Home do aluno importa este CSS)

**Interfaces:**
- Consumes: classes `.lckp-modal__backdrop`, `.lckp-modal`, `.lckp-btn`, `.lckp-btn--ghost` da Task 3.
- Produces: componente `ModalArmario` com as props:
  - `armario` — `{ id, nome, corredor, status }` ou `null`. Quando `null`, o componente não renderiza nada.
  - `valorArmario` — `number`
  - `jaPossuiArmario` — `boolean`
  - `aoFechar` — `() => void`, chamado no X, no backdrop e no `Esc`
  - `aoConfirmar` — `() => void`, chamado no botão de checkout

- [ ] **Step 1: Criar o componente**

```jsx
// front/src/components/ModalArmario.jsx
import React, { useEffect, useRef } from 'react';

// Diálogo de confirmação do armário selecionado pelo aluno.
// Substitui a antiga sidebar de detalhes da Home: em telas pequenas a sidebar
// ficava abaixo da matriz e passava despercebida, e o aluno não tinha um passo
// claro de confirmação antes do checkout.
export default function ModalArmario({ armario, valorArmario, jaPossuiArmario, aoFechar, aoConfirmar }) {
  const caixaRef = useRef(null);

  // Fechar com Esc e prender o foco dentro do diálogo enquanto ele estiver aberto.
  useEffect(() => {
    if (!armario) return;

    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') {
        aoFechar();
        return;
      }
      if (evento.key !== 'Tab') return;

      const focaveis = caixaRef.current?.querySelectorAll('button, [href], input, select, textarea');
      if (!focaveis?.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    caixaRef.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [armario, aoFechar]);

  if (!armario) return null;

  const preco = Number(valorArmario || 0).toFixed(2).replace('.', ',');

  return (
    <div
      className="lckp-modal__backdrop"
      onClick={aoFechar}
      role="presentation"
    >
      <div
        ref={caixaRef}
        className="lckp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-armario"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b border-[var(--border-color)]">
          <div>
            <span className="lckp-label">Armário selecionado</span>
            <h3 id="titulo-modal-armario" className="text-xl font-bold font-display m-0">
              {armario.nome}
            </h3>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar e desmarcar o armário"
            className="lckp-btn lckp-btn--ghost shrink-0"
            style={{ padding: '0.375rem 0.75rem' }}
          >
            ✕
          </button>
        </header>

        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[var(--on-bg-muted)] text-sm">Corredor</span>
            <strong>Bloco {armario.corredor}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--on-bg-muted)] text-sm">Valor</span>
            <strong className="text-[var(--primary-color)] text-lg">R$ {preco}</strong>
          </div>

          {jaPossuiArmario ? (
            <p className="lckp-chip lckp-chip--danger justify-center py-2.5 m-0">
              Você já possui uma locação ativa. Limite de 1 armário por aluno.
            </p>
          ) : (
            <button type="button" onClick={aoConfirmar} className="lckp-btn w-full mt-2">
              Ir para o checkout
            </button>
          )}

          <button type="button" onClick={aoFechar} className="lckp-btn lckp-btn--ghost w-full">
            Escolher outro armário
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ligar o modal na Home e remover a sidebar**

Em `front/src/screens/Home/index.jsx`:

1. Acrescentar o import: `import ModalArmario from '../../components/ModalArmario.jsx';`
2. Remover todo o bloco `<aside className="details-sidebar"> ... </aside>` (linhas 215-255).
3. Trocar o wrapper `<div className="main-layout-grid">` por `<div className="main-layout-full">` — a matriz agora ocupa a largura inteira.
4. Logo antes do `</div>` que fecha `home-admin-container`, renderizar:

```jsx
      <ModalArmario
        armario={armarioSelecionado}
        valorArmario={escolaDados?.valor_armario}
        jaPossuiArmario={jaPossuiArmario}
        aoFechar={() => setArmarioSelecionado(null)}
        aoConfirmar={handleIrParaCheckout}
      />
```

`handleIrParaCheckout` **não muda**: continua navegando com o mesmo `state` (`origemValida`, `armario`, `valorArmario`) que o `CheckoutProtectedRoute` do router exige. Trocar isso quebra o acesso ao checkout.

5. O `color: '#00d2ff'` órfão (linha 231) estava dentro da sidebar removida, então some junto. Confirmar no Step 4.

- [ ] **Step 3: Acrescentar a legenda e a matriz responsiva a `HomeAdmin.css`**

```css
/* A Home do aluno usa a matriz em largura inteira: os detalhes do armário
   passaram para o ModalArmario, então não há mais sidebar para dividir espaço. */
.main-layout-full {
  display: block;
  width: 100%;
}

.locker-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  padding: 1rem 0 0;
  font-size: 0.8125rem;
  color: var(--on-bg-muted);
}
.locker-legend span { display: inline-flex; align-items: center; gap: 0.375rem; }
.locker-legend i {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  display: inline-block;
}

/* Matriz responsiva: 5 colunas no desktop, 4 no tablet, 3 no celular.
   Alvo de toque mínimo de 44px em qualquer tamanho. */
.matrix-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}
.locker-button { min-height: 44px; }

@media (max-width: 768px) {
  .matrix-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 480px) {
  .matrix-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
}

/* Abas de corredor: rolagem horizontal em vez de quebrar em várias linhas. */
@media (max-width: 768px) {
  .tabs-container {
    display: flex;
    overflow-x: auto;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
  }
  .tab-button { flex: 0 0 auto; min-height: 44px; }
  .pagination-arrow { min-width: 44px; min-height: 44px; }
}
```

Se `.matrix-grid` já estiver definido no arquivo, **editar a regra existente** em vez de duplicar — regra duplicada gera conflito de especificidade difícil de rastrear.

- [ ] **Step 4: Confirmar que o ciano órfão sumiu**

Run: `grep -rn "00d2ff" src/`
Expected: nenhuma saída.

- [ ] **Step 5: Build e lint**

Run: `npm run lint && npm run build`
Expected: ambos passam.

- [ ] **Step 6: Verificar o fluxo do aluno no browser**

Run: `npm run dev`, logar como aluno, abrir o mapa de armários.

Conferir, um a um:
- Clicar num armário **disponível** abre o modal com número, corredor e valor.
- `Esc` fecha e o armário fica **desmarcado**.
- Clique no backdrop fecha e desmarca.
- Botão ✕ fecha e desmarca.
- "Escolher outro armário" fecha e desmarca.
- "Ir para o checkout" chega ao checkout com o armário correto — sem cair na tela de bloqueio do `CheckoutProtectedRoute`.
- Clicar num armário **ocupado** não abre nada.
- Com um aluno que já tem armário: o modal mostra o aviso e **não** oferece o botão de checkout.
- Em 375px: matriz em 3 colunas, sem scroll horizontal, abas de corredor rolando na horizontal.
- Teclado: `Tab` circula dentro do modal e não escapa para a página atrás.

- [ ] **Step 7: Commit**

```bash
git add front/src/components/ModalArmario.jsx front/src/screens/Home/index.jsx front/src/screens/HomeAdmin/HomeAdmin.css
git commit -m "feat: popup de confirmacao de armario e matriz responsiva na home do aluno"
```

---

### Task 8: Checkout — tokens globais e mobile

O caso mais pesado. O checkout define um sistema de tokens próprio escopado em `.checkout-page` e pinta o próprio fundo, ignorando o tema da escola.

**Files:**
- Modify: `front/src/screens/Checkout/Checkout.css:8-40` (bloco de tokens locais) e o restante do arquivo
- Modify: `front/src/screens/Checkout/index.jsx:419-422` (estilos inline com `--brass-400`, `--paper-400`)

- [ ] **Step 1: Remapear os tokens locais para os globais**

Substituir o bloco de tokens de `.checkout-page` (linhas 9-27) por:

```css
.checkout-page {
  /* Os tokens locais viram apelidos dos globais. Antes, este bloco definia uma
     paleta paralela e um fundo próprio (--ink-950: #0A0D12), o que fazia o
     checkout ser a única tela imune ao tema escolhido pela escola. */
  --ink-950: var(--bg-color);
  --ink-900: var(--surface-color);
  --ink-800: var(--surface-color);
  --ink-700: var(--surface-raised);
  --ink-600: var(--border-color);
  --brass-300: var(--primary-color);
  --brass-400: var(--primary-color);
  --brass-600: var(--secondary-color);
  --mint-400: var(--success);
  --red-400: var(--danger);
  --paper-050: var(--on-bg);
  --paper-400: var(--on-bg-muted);
  --paper-600: var(--on-bg-muted);

  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
```

Manter o restante da regra (`max-width`, `margin`, `padding`, `color`, `font-family`, `min-height`, `box-sizing`) e trocar o `background` composto por:

```css
  background: transparent;
```

O fundo agora vem do `body`, que já usa `var(--bg-color)`.

- [ ] **Step 2: Restringir a JetBrains Mono à plaqueta**

Run: `grep -n "font-mono" src/screens/Checkout/Checkout.css`

Manter `var(--font-mono)` apenas na regra do número da plaqueta (`.plate-number`). Em qualquer outra regra, trocar por `var(--font-body)`. A monoespaçada faz sentido para um número gravado em metal; para texto corrido, não.

- [ ] **Step 3: Empilhar o layout no celular**

Acrescentar ao final de `Checkout.css`:

```css
/* No celular, as duas colunas empilham e a etiqueta do armário sobe: o aluno
   confirma o que está comprando antes de começar a digitar. */
@media (max-width: 900px) {
  .checkout-grid {
    display: flex;
    flex-direction: column;
  }
  .locker-ticket { order: -1; }
  .form-grid-half { grid-template-columns: 1fr; }
  .checkout-page { padding: 20px 16px 60px; }
  .input-element { width: 100%; box-sizing: border-box; }
  .btn-submit { width: 100%; min-height: 48px; }
  .stepper { font-size: 0.8125rem; gap: 0.75rem; }
  /* O QR Code precisa continuar escaneável mesmo em tela estreita. */
  .qr-frame img { width: 100%; max-width: 260px; min-width: 200px; height: auto; }
}
```

- [ ] **Step 4: Corrigir os estilos inline do JSX**

Em `front/src/screens/Checkout/index.jsx`, linhas 419-422 e 470, os `style` inline referenciam `var(--brass-400)`, `var(--paper-400)`, `var(--paper-050)`. Eles continuam funcionando (agora são apelidos), mas trocar por `var(--primary-color)`, `var(--on-bg-muted)` e `var(--on-bg)` deixa a intenção explícita e permite remover os apelidos depois.

- [ ] **Step 5: Build e lint**

Run: `npm run lint && npm run build`
Expected: ambos passam.

- [ ] **Step 6: Verificar no browser em dois tamanhos**

Run: `npm run dev`, percorrer aluno → mapa → popup → checkout.

Em 1280px: o checkout tem o mesmo fundo navy das demais telas — não mais o quase-preto próprio. A plaqueta do armário continua com o efeito metálico.
Em 375px: a etiqueta do armário aparece **acima** do formulário, campos ocupam a largura toda, sem scroll horizontal.
Selecionar Pix e gerar o QR Code: a imagem fica legível e não estoura a tela.

- [ ] **Step 7: Commit**

```bash
git add front/src/screens/Checkout
git commit -m "style: checkout passa a herdar o tema da escola e empilha no celular"
```

---

### Task 9: HomeAdmin e Armários

**Files:**
- Modify: `front/src/screens/HomeAdmin/HomeAdmin.css` (7 literais)
- Modify: `front/src/screens/HomeAdmin/index.jsx`
- Modify: `front/src/screens/Gerenciamento/Armarios/index.jsx` (14 literais)

- [ ] **Step 1: Localizar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/HomeAdmin/* src/screens/Gerenciamento/Armarios/index.jsx`
Expected: 21 ocorrências.

- [ ] **Step 2: Converter**

Aplicar a tabela da Task 5, Step 2. Onde houver card, aplicar `.lckp-card`; formulários de cadastro de armário usam `.lckp-input` e `.lckp-btn`; badges de status usam `.lckp-chip--success` (disponível) e `.lckp-chip--danger` (ocupado).

A sidebar de detalhes da HomeAdmin **permanece** — só a Home do aluno perdeu a dela na Task 7.

- [ ] **Step 3: Confirmar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/HomeAdmin/ src/screens/Gerenciamento/Armarios/`
Expected: nenhuma saída.

- [ ] **Step 4: Build, lint e conferência**

Run: `npm run lint && npm run build && npm run dev`
Logar como admin. Conferir HomeAdmin (mapa + sidebar de detalhes ainda presente) e a tela de Armários, incluindo criação em lote e edição.

- [ ] **Step 5: Commit**

```bash
git add front/src/screens/HomeAdmin front/src/screens/Gerenciamento/Armarios
git commit -m "style: converte HomeAdmin e Armarios para os tokens de marca"
```

---

### Task 10: Usuários, Histórico e Meu Armário

**Files:**
- Modify: `front/src/screens/Gerenciamento/Usuarios/Gerenciamento.css` (7 literais)
- Modify: `front/src/screens/Gerenciamento/Usuarios/index.jsx`
- Modify: `front/src/screens/Gerenciamento/Historico/index.jsx` (7 literais)
- Modify: `front/src/screens/MeuArmario/index.jsx` (10 literais)

- [ ] **Step 1: Localizar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/Gerenciamento/Usuarios/* src/screens/Gerenciamento/Historico/index.jsx src/screens/MeuArmario/index.jsx`
Expected: 24 ocorrências.

- [ ] **Step 2: Converter**

Aplicar a tabela da Task 5, Step 2. As tabelas de Usuários e Histórico passam a usar `.lckp-table`; os cards, `.lckp-card`; os modais de edição, `.lckp-modal__backdrop` + `.lckp-modal`.

- [ ] **Step 3: Confirmar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/Gerenciamento/ src/screens/MeuArmario/`
Expected: nenhuma saída.

- [ ] **Step 4: Build, lint e conferência**

Run: `npm run lint && npm run build && npm run dev`
Como admin: Usuários (listar, criar, editar papel, excluir) e Histórico (tabela paginada). Como aluno: Meu Armário.
Em 375px, conferir que as tabelas rolam na horizontal dentro do próprio container, sem empurrar a página.

- [ ] **Step 5: Commit**

```bash
git add front/src/screens/Gerenciamento front/src/screens/MeuArmario
git commit -m "style: converte Usuarios, Historico e Meu Armario para os tokens de marca"
```

---

### Task 11: Personalização

Tela sensível: é onde o admin escolhe as cores, e a prévia ao vivo precisa refletir a paleta real.

**Files:**
- Modify: `front/src/screens/Personalizacao/Personalizacao.css` (3 literais)
- Modify: `front/src/screens/Personalizacao/index.jsx` (1 literal)

- [ ] **Step 1: Localizar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/Personalizacao/`
Expected: 4 ocorrências.

- [ ] **Step 2: Converter**

Aplicar a tabela da Task 5, Step 2. Atenção a dois pontos que **não** devem virar token global:

- `perso-preview__bar` e `perso-preview__btn` usam as cores do **formulário em edição** (`primaria`, `secundaria`, `fundo` do estado React), não os tokens globais. É prévia do que será salvo, então precisa mostrar a escolha pendente, não o tema aplicado. Manter como está.
- O `#0b0f19` hardcoded em `perso-preview__btn` (linha 188) é o "texto sobre a cor primária" da prévia. Trocar por `var(--on-primary)`.

Os botões "Padrão" já leem de `PADRAO`, que a Task 2 atualizou para dourado/navy. Nada a fazer.

- [ ] **Step 3: Confirmar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/Personalizacao/`
Expected: nenhuma saída.

- [ ] **Step 4: Build, lint e conferência funcional**

Run: `npm run lint && npm run build && npm run dev`

Como admin, abrir Personalização e conferir:
- Os botões "Padrão" restauram dourado `#E8B44A` / `#C8912E` / navy `#0A1F44`.
- Mudar a cor primária atualiza a prévia imediatamente.
- Salvar aplica o tema em todas as telas sem recarregar a página.
- Definir fundo `#FFFFFF`, salvar, navegar por mapa, checkout e usuários: tudo legível. Restaurar `#0A1F44` ao final.

- [ ] **Step 5: Commit**

```bash
git add front/src/screens/Personalizacao
git commit -m "style: converte Personalizacao para os tokens de marca"
```

---

### Task 12: SuperAdmin

64 cores literais, nenhum token. É a tela mais distante da marca. Diferente das demais, o SuperAdmin **não** é escopado por escola: ele administra a plataforma inteira e deve usar a marca LCKP fixa, nunca o tema de uma instituição.

**Files:**
- Modify: `front/src/screens/SuperAdmin/index.jsx` (todo o arquivo)

**Interfaces:**
- Consumes: `MARCA` da Task 1.

- [ ] **Step 1: Importar a marca**

```js
import { MARCA } from '../../theme/marca.js';
```

- [ ] **Step 2: Converter os literais para a marca fixa**

Aplicar em todo o arquivo:

| Literal | Substituto |
|---|---|
| `bg-[#0b0f19]` | `bg-[#0A1F44]` |
| `bg-[#111827]` / `bg-[#111827]/60` | `bg-[#0D2A52]` / `bg-[#0D2A52]/60` |
| `text-[#f19b33]` | `text-[#E8B44A]` |
| `border-[#f19b33]/40` | `border-[#E8B44A]/40` |
| `focus:border-[#f19b33]` | `focus:border-[#E8B44A]` |
| `from-[#f19b33] to-[#b96f1e]` | `from-[#E8B44A] to-[#C8912E]` |
| `text-[#0b0f19]` (texto sobre dourado) | `text-[#0A1F44]` |

**Usar valores literais da marca aqui, não `var(--primary-color)`** — o SuperAdmin não pode herdar o tema de escola nenhuma. Onde houver `style` inline (não classe Tailwind), preferir `MARCA.navy` / `MARCA.gold` / `MARCA.surface`, que documentam a origem do valor.

- [ ] **Step 3: Alinhar a tela de login ao modal da landing**

Os componentes `TelaLogin` (linhas 24-99) e `TelaTrocarSenha` (101-186) já têm a estrutura certa. Ajustar para espelhar o modal de login da landing: superfície `#0D2A52`, borda `white/10`, cantos `rounded-2xl`, título em `font-display`, botão dourado com texto navy.

- [ ] **Step 4: Confirmar**

Run: `grep -n "#0b0f19\|#111827\|#f19b33\|#b96f1e" src/screens/SuperAdmin/index.jsx`
Expected: nenhuma saída.

- [ ] **Step 5: Build, lint e conferência**

Run: `npm run lint && npm run build && npm run dev`

Abrir `/gerenciamento` e conferir:
- Login com a mesma cara do modal da landing.
- Painel: tabela de instituições, tabela de leads, formulário de cadastro, modal de edição — todos em navy/dourado.
- O modal de edição de escola abre e fecha corretamente.
- Em 375px: as tabelas rolam dentro do container, sem scroll horizontal na página.

- [ ] **Step 6: Commit**

```bash
git add front/src/screens/SuperAdmin
git commit -m "style: reescreve SuperAdmin com a marca LCKP fixa"
```

---

### Task 13: Limpeza final e verificação de ponta a ponta

**Files:**
- Modify: `front/src/index.css` (remover o alias `--box-bg`)

- [ ] **Step 1: Confirmar que nenhum consumidor de `--box-bg` sobrou**

Run: `grep -rn "box-bg" src/`
Expected: apenas a definição em `index.css`. Se alguma tela ainda consumir, convertê-la para `var(--surface-color)` antes de seguir.

- [ ] **Step 2: Remover o alias**

Apagar de `index.css` a linha `--box-bg: var(--surface-color);` e o comentário de duas linhas que a acompanha.

- [ ] **Step 3: Asserção de paleta legada zerada**

Run: `grep -rn "#0b0f19\|#111827\|#f19b33\|#b96f1e\|#00d2ff" src/`
Expected: **nenhuma saída.** Qualquer ocorrência remanescente é uma tela que passou batida — converter antes de seguir.

- [ ] **Step 4: Asserção de tokens sem definição**

Run: `grep -rhoE "var\(--[a-z0-9-]+" src/ | sed 's/var(//' | sort -u`

Conferir cada token da lista contra as definições em `index.css` e no bloco `.checkout-page`. Todo token referenciado precisa ter definição — um token indefinido não gera erro, apenas some silenciosamente, que foi exatamente como o checkout acumulou dívida.

- [ ] **Step 5: Build e lint finais**

Run: `npm run lint && npm run build`
Expected: ambos passam.

- [ ] **Step 6: Percurso completo do aluno em 375px**

Run: `npm run dev`, com o browser em 375×812.

Percorrer: landing → login → mapa de armários → popup → checkout → Pix.
Expected: nenhuma tela com scroll horizontal; nenhuma quebra de contraste; identidade visual contínua da landing ao QR Code.

- [ ] **Step 7: Percurso completo do admin em 1280px**

Percorrer: login → HomeAdmin → Armários → Usuários → Histórico → Personalização.
Expected: mesma identidade em todas.

- [ ] **Step 8: Percurso do SuperAdmin**

Percorrer: `/gerenciamento` → login → painel → modal de edição.
Expected: marca LCKP fixa, sem influência de tema de escola.

- [ ] **Step 9: Cenário de fundo claro**

Como admin, definir fundo `#FFFFFF` na Personalização, salvar, percorrer mapa, checkout e usuários.
Expected: tudo legível — este é o cenário que estava quebrado antes da Task 2. Restaurar `#0A1F44` ao final.

- [ ] **Step 10: Commit**

```bash
git add front/src/index.css
git commit -m "chore: remove alias --box-bg apos conversao completa das telas"
```

---

## Auto-revisão do plano

**Cobertura da spec:**

| Seção da spec | Task |
|---|---|
| 2.1 Fonte única da marca | 1 |
| 2.2 Escala de tokens | 2 |
| 2.3 Derivação de tema por escola | 2 |
| 2.4 Vocabulário de componentes | 3 |
| 2.5 Conversão por tela | 5, 6, 8, 9, 10, 11, 12 |
| 2.6 Popup de seleção de armário | 7 |
| 2.7 Responsividade mobile | 7 (mapa), 8 (checkout) |
| 2.8 Bloqueio de zoom | 4 |
| 4 Verificação (8 critérios) | 13 |
| 5 Riscos — `--box-bg` como alias | 2 (cria), 13 (remove) |

Sem lacunas.

**Consistência de nomes:** `MARCA` (Task 1) é consumido com o mesmo nome nas Tasks 2 e 12. `PADRAO` mantém a forma `{ primary, secondary, bg }` já esperada por `Personalizacao/index.jsx:5`. As props de `ModalArmario` declaradas na Task 7 (`armario`, `valorArmario`, `jaPossuiArmario`, `aoFechar`, `aoConfirmar`) são as mesmas usadas na chamada dentro da mesma task. As classes `.lckp-*` definidas na Task 3 são as referenciadas nas Tasks 5 a 12.

**Sem placeholders:** todo passo de código traz o código real. Os passos de conversão trazem tabela de mapeamento explícita mais um `grep` de verificação, em vez de "converter as cores apropriadamente".

---

## Progresso da execução — 2026-08-05

Branch: `leva1-design-system`. Base: `main` @ `b7fdcb3`.

| Task | Status | Commit |
|---|---|---|
| 1 Fonte única da marca | ✅ | `e465749` |
| 2 Escala de tokens | ✅ | `7af5235` |
| 3 Vocabulário `.lckp-*` | ✅ | `26670b1` |
| 4 Bloqueio de zoom | ✅ | `707cf05` |
| 5 Chrome compartilhado | ✅ | `9362867` |
| — Remoção do tema por escola | ✅ | `39bf623` |
| 6 Autenticação | ✅ | `39bf623` |
| 11 Personalização | ✅ | `39bf623` |
| 7 Popup do armário | ✅ | `7779631` |
| 8 Checkout | ✅ | `6b81407` |
| **9 HomeAdmin + Armários** | ⬜ pendente | |
| **10 Usuários + Histórico + Meu Armário** | ⬜ pendente | |
| **12 SuperAdmin** | ⬜ pendente | |
| **13 Limpeza final** | ⬜ pendente | |

### Paleta legada restante (medida após o commit `6b81407`)

```
14  screens/Gerenciamento/Armarios/index.jsx      → Task 9
 7  screens/HomeAdmin/HomeAdmin.css               → Task 9
 7  screens/Gerenciamento/Historico/index.jsx     → Task 10
 7  screens/Gerenciamento/Usuarios/Gerenciamento.css → Task 10
 9  screens/MeuArmario/index.jsx                  → Task 10
 3  screens/Personalizacao/Personalizacao.css     → Task 13 (CSS morto)
35  screens/SuperAdmin/index.jsx                  → Task 12
```

### Correções ao plano descobertas durante a execução

Registradas porque o plano original afirmava o contrário:

1. **`npm run lint` não passa nesta base** — 29 erros pré-existentes. O portão real é `npx eslint <arquivos tocados>` sem erro **novo**. Já refletido nos Global Constraints.
2. **A matriz responsiva 5→4→3 já existia** em `HomeAdmin.css:346-370`. A Task 7 não precisou criá-la; só acrescentou `.main-layout-full`, a legenda, os estilos do modal e os alvos de toque.
3. **O empilhamento mobile do checkout já existia** em `Checkout.css:203-215`, inclusive com `.locker-ticket { order: -1 }`. A Task 8 acrescentou apenas alvos de toque e o dimensionamento do QR.
4. **`#00d2ff` aparecia em dois lugares**, não um: `Home/index.jsx` (removido junto com a sidebar) e `ProtectedRoute.jsx:58`. Ambos corrigidos na Task 5.
5. **`Login.css` tinha um `:root` próprio** redefinindo `--primary-color`, `--secondary-color`, `--bg-color` e `--box-bg` com a paleta antiga — um quarto sistema paralelo, não mencionado na spec. Removido.
6. **Sobravam `rgba(217,165,92,...)`** — o latão do checkout — fora do bloco de tokens, em 6 pontos. Tokenizados na Task 8.
7. **Tasks 6 e 11 saíram de graça** junto com a remoção do tema por escola (`39bf623`).

### Ajuste de escopo do usuário durante a execução

> *"vamo remover essa personalizacao do admin da escola, estiliacao padrao oque muda é so os templates pras logos"*

Ver a emenda no topo da spec. `theme/aplicarTema.js` foi deletado; a Task 13 **não** precisa mais verificar o cenário de fundo claro (critério 6 da seção 4 da spec), porque não há mais fundo configurável.
