# Mapa de corredores na escolha de armário

Data: 16/09/2026
Protótipo aprovado: `docs/prototipos/mapa-corredores.html`

## Objetivo

Trocar a grade paginada de armários por duas telas que reproduzem a escola:

1. **Planta**: vista de cima com o pátio e os corredores, cada corredor na cor real dele.
2. **Parede**: dentro do corredor, olhando para a parede, com as portas das salas, os blocos de armários no formato real e os marcos (hidrante, extintor, lixeira). O aluno anda bloco a bloco e toca no armário livre.

A maior parte das compras vai acontecer no celular e no totem. O celular é o caso principal de projeto, não uma adaptação.

## Escopo desta entrega

Entra:

- Tabelas do mapa e a carga do Bento Quirino.
- Endpoint único de leitura do mapa.
- Tela do aluno nova (planta + parede).
- Seção "Mapa de armários" na tela de Personalização, com as cores do mapa.

Fica para depois:

- Editor visual de corredores e blocos para o admin. Nesta entrega o mapa entra por SQL.
- Mapa real da ETECAP e das outras escolas.

## Regra de convivência

Escola sem corredores cadastrados continua vendo a grade atual. Nenhuma escola muda de tela só por aplicar a migração.

---

## 1. Banco

Migração `Backend/sql/2026-09-16-mapa-corredores.sql`.

### `corredores`

| coluna | tipo | observação |
| --- | --- | --- |
| `id` | uuid pk | |
| `school_id` | uuid fk `schools` | `on delete cascade` |
| `codigo` | text | igual ao valor de `lockers.corredor` já usado pela escola |
| `nome` | text | "Corredor 1", "Mecânica" |
| `nome_curto` | text null | usado nos cartões estreitos do celular ("Corredor") |
| `sigla` | text | "1", "M" |
| `cor` | text | hex, cor real do corredor |
| `ordem` | smallint | |
| `area_deitada` | text | `grid-area` na planta em tela deitada, ex. `1 / 3 / 3 / 4` |
| `area_estreita` | text | `grid-area` na planta no celular |

Único: `(school_id, codigo)`.

### `plantas`

Uma linha por escola, com a grade da planta.

| coluna | tipo |
| --- | --- |
| `school_id` | uuid pk fk `schools` |
| `colunas_deitada`, `linhas_deitada` | text |
| `colunas_estreita`, `linhas_estreita` | text |
| `patio_area_deitada`, `patio_area_estreita` | text |
| `patio_recuo_deitada`, `patio_recuo_estreita` | text null |

O recuo centraliza o nome "Pátio" só na parte que não fica debaixo de um cartão.

### `corredor_itens`

A parede do corredor, na ordem em que aparece andando.

| coluna | tipo | observação |
| --- | --- | --- |
| `id` | uuid pk | |
| `corredor_id` | uuid fk `corredores` | `on delete cascade` |
| `ordem` | smallint | |
| `tipo` | text | check: `portal`, `porta`, `bloco`, `fundo`, `fim`, `hidrante`, `extintor`, `lixeira`, `mural`, `quadro`, `rampa` |
| `numero` | text null | número da sala (`porta`, `fundo`) |
| `rotulo` | text null | laboratório ou nome do ambiente ("Ciências", "Salão Nobre") |
| `variante` | text null | check: `laboratorio`, `estoque`, `vidro` |
| `tom` | text null | check: `claro`, `escuro` (só `bloco`) |
| `larguras` | smallint[] null | largura de cada coluna em cm (só `bloco`) |

Único: `(corredor_id, ordem)`.

### `lockers`

Três colunas novas, todas opcionais:

- `item_id` uuid fk `corredor_itens` `on delete set null`
- `coluna` smallint
- `linha` smallint

Único parcial: `(item_id, coluna, linha) where item_id is not null`.

Armário sem posição continua existindo e aparecendo no admin. Só não aparece na parede.

### `schools.mapa_estilo`

`jsonb null`. Vazio = tema escuro padrão. Formato:

```json
{
  "modo": "escuro",
  "fundo": "#091528",
  "parede": "#16243D",
  "faixa": "#101B2E",
  "vidro": "#1D3050",
  "porta": "#4A2C1E",
  "armario_claro": "#5A6880",
  "armario_escuro": "#3A4759",
  "selecao": "#E8B44A"
}
```

As cores de status (livre, ocupado, manutenção) **não** são configuráveis: precisam significar a mesma coisa em qualquer escola.

### RLS

As três tabelas novas com RLS ligado e sem política, como `lockers` e `rentals`. O acesso é só pelo backend com a service role.

### Carga do Bento Quirino

Arquivo separado `Backend/sql/2026-09-16-mapa-bento-quirino.sql`:

1. Cria a planta, os 4 corredores e os itens a partir do protótipo aprovado.
2. Liga cada armário existente à posição pelo número: `lockers.nome` convertido para inteiro é igual ao número da etiqueta na grade. A numeração da APM é única na escola inteira, então o casamento é por escola e número, sem depender do texto gravado em `lockers.corredor`.
3. Termina com três consultas de conferência: armários da escola que ficaram sem posição, posições da parede que não encontraram armário, e números que aparecem em mais de um armário da escola (esses não são ligados automaticamente).

Parte da numeração das fotos é estimada. A conferência é o que diz onde corrigir.

---

## 2. API

### `GET /armarios/escola/:schoolCode/mapa`

`verificarToken`, escopo da escola pelo token como nas outras rotas.

```json
{
  "planta": { "colunas_deitada": "...", "...": "..." },
  "estilo": { "...": "..." },
  "corredores": [
    {
      "id": "uuid", "codigo": "1", "nome": "Corredor 1", "nome_curto": "Corredor",
      "sigla": "1", "cor": "#F5C542", "area_deitada": "5 / 3 / 7 / 4", "area_estreita": "5 / 3 / 7 / 4",
      "itens": [
        { "id": "uuid", "tipo": "bloco", "tom": "claro", "larguras": [30, 30, 30, 30] }
      ]
    }
  ],
  "armarios": [
    { "id": "uuid", "nome": "113", "item_id": "uuid", "coluna": 0, "linha": 2, "estado": "livre", "meu": false }
  ]
}
```

- `estado` já vem traduzido: `disponivel` → `livre`; `alugado` e `funcionario` → `ocupado`; `manutencao` → `manutencao`.
- **Não** devolve `usuario_id` nem nome de ocupante. O aluno só sabe qual é o dele (`meu`).
- Escola sem corredores responde `{ "corredores": [] }`, e o front cai na grade atual.

### Personalização

O salvamento que já existe em `schools` passa a aceitar `mapa_estilo`, validando que cada cor é hex de 6 dígitos e que `modo` é `escuro`, `claro` ou `personalizado`.

---

## 3. Tela do aluno

Substitui o conteúdo de `front/src/screens/Home/index.jsx` quando a escola tem mapa.

### Componentes

- `screens/Home/Planta.jsx`: grade CSS com o pátio e um botão por corredor.
- `screens/Home/Parede.jsx`: SVG da parede. O desenho vem de funções puras em `screens/Home/desenhoParede.js`, portadas do protótipo.
- `screens/Home/Trilha.jsx`: régua de posição, cada parada é um alvo de toque.
- `screens/Home/BarraSelecao.jsx`: armário escolhido e botão "Alugar".
- `utils/useCelular.js`: `matchMedia('(max-width: 640px), (pointer: coarse) and (max-width: 1024px)')`.
- `utils/useMapaEscola.js`: carrega o endpoint e monta os corredores.

### Comportamento

- **Paradas**: cada bloco e cada porta com placa. O fim do corredor e o estoque não são paradas.
- **Computador e totem**: uma escala para o corredor inteiro, setas por cima da cena nas laterais.
- **Celular**: cada parada ocupa a largura da tela; porta mostra a placa inteira, bloco mostra os armários de ponta a ponta. O que está fora fica escurecido e tocar ali anda uma parada. As setas ficam numa faixa própria embaixo da cena, fora de cima dos armários.
- **Nitidez**: o SVG é redimensionado na escala final de cada parada; a transição parte do quadro anterior convertido para a escala nova.
- **Seleção**: tocar num armário livre seleciona; tocar de novo desmarca. Só armário livre é tocável.
- **Alugar**: abre o `ModalArmario` atual, que continua dono de valor, limite por aluno e contrato, e segue para o checkout como hoje.
- **Planta**: mesma orientação real do prédio em todas as telas (Mecânica à esquerda, pátio no meio, corredores 3, 2 e 1 à direita). No celular o pátio vira uma faixa estreita.
- **Totem em pé** (largura ≥ 900 e altura maior que largura): `zoom: 1.5` no corpo.
- **Movimento**: 280 ms com `cubic-bezier(.23, 1, .32, 1)`; respeita `prefers-reduced-motion`.

---

## 4. Personalização

Nova seção "Mapa de armários" na tela `screens/Personalizacao`, abaixo das cores da escola, reaproveitando o seletor de cor com campo hex que a tela já tem.

- Modo: Escuro (padrão), Claro, Personalizado.
- Cores: fundo da cena, parede, faixa baixa, vidro, portas, armário claro, armário escuro, seleção.
- Cor de cada corredor (grava em `corredores.cor`).
- Prévia pequena de uma porta e um bloco com as cores escolhidas.
- "Voltar ao padrão" limpa `mapa_estilo`.

---

## 5. Verificação

- `npm run build` do front sem erro.
- Lint: comparar a contagem de erros antes e depois (o repositório já tem erros antigos).
- Tela testada em 390×844, 1440×860 e 1080×1920, com dados simulados enquanto não houver chave do Supabase local.
- Teste ponta a ponta (depende do SQL aplicado e da service key): escolher armário livre, abrir o modal, chegar no checkout com o armário certo.

## 6. Entrega

- Branch `feat/mapa-corredores` a partir de `main`.
- PR para `main`. A `develop` está 85 commits atrás, e os PRs recentes (#13, #14) foram direto para `main`.
- O mapa anterior foi revertido em `ba6dc8f`. Esta entrega não reaproveita aquele código; o ponto de alinhamento com o time é o próprio PR.
