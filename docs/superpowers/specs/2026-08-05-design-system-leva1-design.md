# LCKP — Leva 1: Design System e Experiência Visual

**Data:** 2026-08-05
**Escopo:** unificação visual do sistema, popup de seleção de armário, responsividade mobile, bloqueio de zoom
**Fora de escopo:** PagBank (Leva 2), RA/RM (Leva 3), templates de logo (Leva 3)

> **Emenda de 2026-08-05, durante a execução.** O usuário decidiu **remover a personalização de cores pelo admin da escola**: *"vamo remover essa personalizacao do admin da escola, estiliacao padrao oque muda é so os templates pras logos"*. Consequências, já aplicadas:
>
> - `theme/aplicarTema.js` foi **deletado**. Não existe mais tema por escola; os tokens de `:root` em `index.css` são fixos na marca LCKP.
> - `EscolaContext` deixou de aplicar tema; segue provendo `escola`, `carregando`, `erro`, `recarregar`, `atualizarEscolaLocal`.
> - A tela de Personalização perdeu os 3 seletores de cor e a prévia. Restam logo e valor do armário; os templates de logo entram na Leva 3.
> - As colunas `schools.primary_color`, `secondary_color` e `bg_color` deixam de ser lidas e escritas pelo front. **Permanecem no banco** — remover exige migração, o que é assunto de outra leva.
> - A seção 2.3 (derivação de tema por escola) e o critério 6 da seção 4 (cenário de fundo claro) ficam **sem efeito**.
> - O card "Cores e logo da sua escola" da landing prometia troca de paleta. Foi reescrito para falar só de logo, senão o material de venda descreveria um recurso inexistente.

---

## 1. Problema

O sistema tem **três identidades visuais paralelas** que não conversam entre si. Um usuário que sai da landing, faz login e chega ao checkout atravessa três produtos diferentes.

| Identidade | Onde vive | Paleta | Tipografia |
|---|---|---|---|
| **Landing** | `screens/Landing/index.jsx`, constantes inline | navy `#0A1F44` / dourado `#E8B44A` | Inter + Space Grotesk |
| **Sistema** | `index.css` `:root` | âmbar `#f19b33` / `#0b0f19` | Inter + Space Grotesk |
| **Checkout** | `Checkout.css`, escopado em `.checkout-page` | `--ink-*` / `--brass-*` / `--paper-*` | + JetBrains Mono |

Consequências concretas:

- A landing é a referência de marca, mas suas cores são **constantes locais** (`const NAVY`, `const GOLD`), usadas 30 vezes no arquivo. Não há como o sistema herdar delas.
- O checkout **pinta o próprio fundo** (`--ink-950: #0A0D12`) e portanto ignora `--bg-color` da escola. Uma escola que configure fundo claro tem todas as telas claras, menos o checkout.
- `--box-bg` é `rgba(17,24,39,.6)` fixo. Com fundo claro, os cards continuam cinza-escuro e o texto some.
- `SuperAdmin/index.jsx` tem **64 ocorrências** de cor literal (`#0b0f19`, `#111827`, `#f19b33`) e nunca consumiu token nenhum.
- `Home/index.jsx:231` tem um `color: '#00d2ff'` — ciano — que não pertence a nenhuma das três paletas.

Distribuição das cores literais da paleta legada:

```
64  screens/SuperAdmin/index.jsx
14  screens/Gerenciamento/Armarios/index.jsx
10  screens/MeuArmario/index.jsx
 7  screens/HomeAdmin/HomeAdmin.css
 7  screens/Gerenciamento/Usuarios/Gerenciamento.css
 7  screens/Gerenciamento/Historico/index.jsx
 6  screens/Auth/Login.css
 4  index.css
 3  screens/Personalizacao/Personalizacao.css
 2  router.jsx  ·  2  components/ProtectedRoute.jsx
 1  cada: Personalizacao, Home, Auth, SideBarAdmin, SideBar, NavBar
```

---

## 2. Arquitetura da solução

### 2.1 Fonte única da marca — `front/src/theme/marca.js`

Módulo novo, sem dependências, exportando a paleta LCKP extraída da landing:

```js
export const MARCA = {
  navy: '#0A1F44',
  navyDeep: '#06122B',
  surface: '#0D2A52',
  gold: '#E8B44A',
  goldDeep: '#C8912E',
  goldSoft: 'rgba(232,180,74,0.14)',
  sucesso: '#3DDC97',
  erro: '#EF4444'
};
```

Dois consumidores:

- `screens/Landing/index.jsx` importa daqui e apaga suas constantes locais. A landing continua com a marca LCKP fixa — ela é página de marketing, não é escopada por escola, e **não** deve reagir ao tema de escola nenhuma.
- `theme/aplicarTema.js` usa os mesmos valores como `PADRAO`.

Isso é o que responde ao pedido "seguir com o modelo da landing": a landing deixa de ser um caso especial e passa a ser a definição.

### 2.2 Escala de tokens — `index.css`

O `:root` passa de 6 tokens para uma escala completa:

| Token | Valor padrão | Papel |
|---|---|---|
| `--primary-color` | `#E8B44A` | ação, destaque, foco |
| `--secondary-color` | `#C8912E` | gradientes, estado hover |
| `--bg-color` | `#0A1F44` | fundo da aplicação |
| `--surface-color` | `#0D2A52` | cards, painéis, modais |
| `--surface-raised` | derivado | menus, dropdowns, popovers |
| `--border-color` | `rgba(255,255,255,.10)` | divisórias |
| `--on-primary` | `#0A1F44` | texto sobre dourado |
| `--on-bg` | `#FFFFFF` | texto sobre fundo |
| `--on-bg-muted` | derivado | texto secundário |
| `--success` / `--danger` | `#3DDC97` / `#EF4444` | estados semânticos |
| `--radius-card` / `--radius-control` | `16px` / `10px` | forma |
| `--shadow-panel` | `0 30px 60px -15px rgba(0,0,0,.6)` | elevação |

`--box-bg` fica como **alias de `--surface-color`** para não quebrar consumidores existentes durante a conversão, e sai no fim.

### 2.3 Derivação de tema por escola — `aplicarTema.js`

Hoje a função define 5 propriedades e assume fundo escuro. Passa a derivar a escala inteira a partir das 3 cores que a escola configura:

- `--surface-color`: mistura de `bg` com branco (fundo escuro) ou preto (fundo claro), via `color-mix`.
- `--border-color`, `--on-bg-muted`: mesma lógica de contraste da `luminancia()` que já existe no arquivo.
- `--on-primary` e `--on-bg`: mantêm a lógica atual, que já está correta.

Ganho real: uma escola com fundo claro deixa de ter cards ilegíveis. Hoje isso está quebrado.

### 2.4 Vocabulário de componentes — `index.css`

Os 5 arquivos CSS de tela somam **1.351 linhas** repetindo card/input/botão/tabela/chip com cores literais. Em vez de converter cada arquivo isoladamente, defino um conjunto pequeno de classes que copiam as formas da landing:

| Classe | Forma (herdada da landing) |
|---|---|
| `.lckp-card` | `border-white/10`, superfície translúcida, `--radius-card`, `--shadow-panel` |
| `.lckp-btn` | dourado sólido, texto navy, `hover:brightness-110`, `active:scale-[.98]`, `cursor-pointer` |
| `.lckp-btn--ghost` | borda `white/15`, fundo transparente |
| `.lckp-btn--danger` | vermelho translúcido, borda vermelha |
| `.lckp-input` | `bg-black/20`, borda `white/10`, foco na cor primária |
| `.lckp-table` | cabeçalho `uppercase tracking-widest`, divisórias `white/5` |
| `.lckp-chip` | pílula translúcida, variantes `--success` / `--danger` / `--muted` |
| `.lckp-label` | `text-xs font-semibold uppercase tracking-widest`, opacidade reduzida |
| `.lckp-modal` / `.lckp-modal__backdrop` | `backdrop-blur`, superfície `--surface-color` |

Os CSS de tela passam a consumir isso e encolhem.

### 2.5 Conversão por tela

**Checkout** é o caso mais pesado: seu bloco de tokens local (`--ink-*`, `--brass-*`, `--paper-*`) é remapeado para os tokens globais e o `background` próprio da `.checkout-page` sai, para o fundo da escola aparecer. O conceito de "plaqueta de metal" da etiqueta do armário é bom e **fica** — só passa a ser desenhado com os tokens globais. A fonte `JetBrains Mono` fica restrita ao número do armário na plaqueta, onde faz sentido; nos demais lugares sai.

**SuperAdmin** é reescrito visualmente com a marca LCKP fixa, sem tokens de escola — ele administra a plataforma inteira e não pertence a nenhuma instituição. Sua tela de login passa a espelhar o modal de login da landing.

**Demais telas** (Login, Alterar Senha, Home, HomeAdmin, Armários, Usuários, Histórico, Meu Armário, Personalização, NavBar, SideBar, SideBarAdmin) trocam literal por token, sem mudança estrutural.

O `#00d2ff` órfão em `Home/index.jsx:231` vira `--primary-color`.

### 2.6 Popup de seleção de armário — `components/ModalArmario.jsx`

Componente novo. Abre quando o aluno seleciona um armário **disponível** na Home.

**Conteúdo:** identificação do armário, corredor, preço configurado da escola.

**Saídas:**
- *Ir para o checkout* — botão primário; navega mantendo o `state` atual (`origemValida`, `armario`, `valorArmario`) que o `CheckoutProtectedRoute` exige.
- *Fechar* — botão X, clique no backdrop ou `Esc`. **Fechar sempre desseleciona** o armário, para o aluno escolher outro.

**Acessibilidade:** `role="dialog"`, `aria-modal="true"`, foco preso dentro do modal, foco devolvido ao armário de origem no fechamento.

**Regra de negócio preservada:** se o aluno já tem armário (`jaPossuiArmario`), o modal mostra o aviso de limite e não oferece o botão de checkout — mesma trava que existe hoje na sidebar.

**Consequência estrutural:** a `.details-sidebar` sai da Home do aluno, já que o modal assume o papel dela. A matriz passa a ocupar a largura inteira, com uma barra de legenda (disponível / ocupado / selecionado) abaixo. A Home do **admin** (`HomeAdmin`) mantém a sidebar — é outra tela, com outro uso.

### 2.7 Responsividade mobile

**Checkout:** o grid de 2 colunas empilha; a etiqueta do armário sobe para cima do formulário (o aluno confirma o que está comprando antes de digitar); campos a 100%; stepper compacto; o QR Code do Pix ganha largura mínima garantida para continuar escaneável.

**Mapa de armários:** matriz responsiva de 5 → 4 → 3 colunas; alvos de toque ≥ 44px; abas de corredor com scroll horizontal e indicação de transbordo; controles de paginação maiores.

### 2.8 Bloqueio de zoom — `theme/bloquearZoom.js`

Módulo novo exportando uma constante `BLOQUEAR_ZOOM` e a função que aplica o bloqueio, chamada em `main.jsx`:

- `maximum-scale=1, user-scalable=no` no meta viewport de `index.html`;
- `preventDefault` em `gesturestart` / `gesturechange` (iOS ignora a meta tag desde o iOS 10);
- supressão do duplo-toque para zoom;
- `preventDefault` em `wheel` com `ctrlKey` (zoom de desktop).

**Ressalva registrada:** isso viola o critério WCAG 1.4.4 (Resize Text) e prejudica alunos com baixa visão. Foi implementado a pedido explícito do usuário, cujo motivo declarado foi estético ("pra não ficar esquisito") — motivo que a responsividade da seção 2.7 já endereça por conta própria. Por isso o bloqueio fica isolado atrás de uma constante única: desligar é trocar um valor para `false`, sem tocar em mais nada.

---

## 3. Arquivos afetados

**Novos**
- `front/src/theme/marca.js`
- `front/src/theme/bloquearZoom.js`
- `front/src/components/ModalArmario.jsx`

**Modificados**
- `front/index.html` — meta viewport
- `front/src/main.jsx` — chamada do bloqueio de zoom
- `front/src/index.css` — escala de tokens + vocabulário de componentes
- `front/src/theme/aplicarTema.js` — derivação da escala
- `front/src/screens/Landing/index.jsx` — passa a importar de `marca.js`
- `front/src/screens/SuperAdmin/index.jsx` — reescrita visual
- `front/src/screens/Home/index.jsx` — modal, remoção da sidebar, matriz full-width
- `front/src/screens/Checkout/index.jsx` + `Checkout.css` — tokens globais, mobile
- `front/src/screens/HomeAdmin/HomeAdmin.css` + `index.jsx`
- `front/src/screens/Auth/Login.css`, `index.jsx`, `AlterarSenha.jsx`
- `front/src/screens/Gerenciamento/Usuarios/Gerenciamento.css` + `index.jsx`
- `front/src/screens/Gerenciamento/Armarios/index.jsx`
- `front/src/screens/Gerenciamento/Historico/index.jsx`
- `front/src/screens/MeuArmario/index.jsx`
- `front/src/screens/Personalizacao/Personalizacao.css` + `index.jsx`
- `front/src/components/NavBar.jsx`, `SideBar.jsx`, `SideBarAdmin.jsx`
- `front/src/router.jsx`, `front/src/components/ProtectedRoute.jsx` — telas de carregamento/erro

**Não tocados:** todo o `Backend/`. A Leva 1 não altera nenhuma API, nenhum contrato e nenhuma tabela.

---

## 4. Verificação

Sem suíte de testes automatizados no projeto, a verificação é manual e por inspeção, contra critérios objetivos:

1. `grep` por `#0b0f19|#111827|#f19b33|#b96f1e|#00d2ff` em `front/src` retorna **zero** ocorrências fora de `marca.js`.
2. Nenhum token `var(--x)` referenciado sem definição correspondente.
3. Percurso do aluno em 375px de largura: landing → login → mapa → popup → checkout → Pix, sem scroll horizontal em nenhuma tela.
4. Percurso do admin: login → HomeAdmin → armários → usuários → histórico → personalização.
5. SuperAdmin: login → painel → tabelas → modal de edição.
6. Trocar a cor de fundo da escola para um valor **claro** na Personalização e confirmar que todas as telas — inclusive o checkout — permanecem legíveis. Este é o cenário hoje quebrado.
7. Popup: `Esc`, backdrop e X desselecionam; o botão de checkout preserva o `state` exigido pelo `CheckoutProtectedRoute`.
8. Aluno que já tem armário: popup mostra o aviso e não oferece checkout.

---

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Conversão em massa de cor quebra layout sem ninguém notar | Converter tela a tela, verificando cada uma antes da próxima |
| Remover a sidebar da Home do aluno quebra o fluxo de checkout | O modal reusa exatamente o mesmo `navigate` com o mesmo `state`; o `CheckoutProtectedRoute` não muda |
| `--box-bg` removido cedo demais quebra telas não convertidas | Manter como alias de `--surface-color` até a última tela ser convertida |
| Bloqueio de zoom rejeitado depois de ver o resultado | Isolado atrás de `BLOQUEAR_ZOOM`; reverter é trocar um booleano |
