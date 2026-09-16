# Mapa de Corredores — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar a grade paginada de armários por planta + parede do corredor, com os armários reais do banco, e dar ao admin as cores do mapa na Personalização.

**Architecture:** três tabelas novas (`plantas`, `corredores`, `corredor_itens`) e posição no armário (`item_id`, `coluna`, `linha`). Um endpoint devolve o mapa pronto. No front, funções puras (geometria, desenho SVG, paleta) testadas com `node --test`, e componentes React finos por cima. Escola sem mapa continua na grade atual.

**Tech Stack:** Node + Express + Supabase JS (Backend), React 19 + Vite + React Router 7 (front), Postgres (Supabase), `node:test` (sem dependência nova).

**Spec:** `docs/superpowers/specs/2026-09-16-mapa-corredores-design.md`
**Protótipo aprovado:** `docs/prototipos/mapa-corredores.html`

## Global Constraints

- Branch `feat/mapa-corredores`; PR para `main`.
- Commits no formato `tipo(escopo): descrição curta no imperativo`, em português, sem linhas de coautoria.
- Código em português (nomes de variáveis, funções e comentários), comentário só onde explica um porquê.
- Nenhuma dependência nova em `package.json`. Testes com `node --test`.
- Estados de armário no banco: `disponivel`, `alugado`, `funcionario`, `manutencao`. No mapa: `livre`, `ocupado`, `manutencao`.
- Cores de status fixas: livre `#3D7BEA`, ocupado `#DC4438`, manutenção amarelo `#F0BE2C` listrado.
- Celular = `(max-width: 640px), (pointer: coarse) and (max-width: 1024px)`.
- Escola identificada por `schools.codigo`; o Bento Quirino é `etec-043`.
- Lint do front já tem erros antigos: comparar a contagem antes e depois, não exigir zero.
- A service key do Supabase não está no `.env` local: tudo que depende do banco é validado com dados simulados, e o SQL é aplicado pelo Miguel no SQL Editor.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `Backend/sql/2026-09-16-mapa-corredores.sql` | tabelas, colunas e RLS |
| `Backend/src/servicos/mapaCorredores.js` | tradução de estado, validação de `mapa_estilo`, montagem da resposta |
| `Backend/src/servicos/mapaCorredores.test.js` | testes das funções acima |
| `Backend/src/controladores/armariosControlador.js` | + `obterMapa` |
| `Backend/src/rotas/armarios.js` | + rota `GET /escola/:schoolCode/mapa` |
| `Backend/src/controladores/escolasControlador.js` | + `mapa_estilo` editável, validado e público |
| `Backend/scripts/mapas/bentoQuirino.js` | dados do mapa do Bento Quirino |
| `Backend/scripts/gerarSqlMapa.js` | gera o SQL de carga a partir dos dados |
| `Backend/scripts/gerarSqlMapa.test.js` | testes do gerador |
| `Backend/sql/2026-09-16-mapa-bento-quirino.sql` | saída gerada, commitada |
| `front/src/screens/Home/mapa/geometria.js` | posições na parede, paradas, enquadramento |
| `front/src/screens/Home/mapa/estiloMapa.js` | paletas e variáveis CSS |
| `front/src/screens/Home/mapa/desenhoParede.js` | SVG da parede em texto |
| `front/src/screens/Home/mapa/*.test.js` | testes das três acima |
| `front/src/utils/useCelular.js` | detecção de celular |
| `front/src/utils/useMapaEscola.js` | carrega o mapa |
| `front/src/services/armariosServices.js` | + `buscarMapa` |
| `front/src/screens/Home/GradeArmarios.jsx` | a tela de hoje, movida sem mudança |
| `front/src/screens/Home/index.jsx` | escolhe mapa ou grade |
| `front/src/screens/Home/MapaArmarios.jsx` | estado, seleção, modal e checkout |
| `front/src/screens/Home/Planta.jsx` | planta |
| `front/src/screens/Home/Parede.jsx` | cena, câmera, setas, toque |
| `front/src/screens/Home/Trilha.jsx` | régua de posição |
| `front/src/screens/Home/BarraSelecao.jsx` | armário escolhido + Alugar |
| `front/src/screens/Home/Mapa.css` | estilos do mapa |
| `front/src/screens/Personalizacao/CampoCor.jsx` | seletor de cor, movido de `index.jsx` |
| `front/src/screens/Personalizacao/SecaoMapa.jsx` | seção "Mapa de armários" |
| `front/src/screens/Personalizacao/index.jsx` | nova aba e payload |

---

### Task 1: Serviço do mapa no backend

**Files:**
- Create: `Backend/src/servicos/mapaCorredores.js`
- Create: `Backend/src/servicos/mapaCorredores.test.js`
- Modify: `Backend/package.json` (script `test`)

**Interfaces:**
- Produces:
  - `traduzirEstado(status: string): 'livre' | 'ocupado' | 'manutencao'`
  - `validarMapaEstilo(estilo: unknown): { valido: true, valor: object | null } | { valido: false, erro: string }`
  - `montarRespostaMapa({ planta, corredores, itens, armarios, usuarioId, estilo }): { corredores: [] } | { planta, estilo, corredores, armarios }`

- [ ] **Step 1: Adicionar o script de teste**

Em `Backend/package.json`, dentro de `"scripts"`, depois de `"dev"`:

```json
    "test": "node --test"
```

- [ ] **Step 2: Escrever os testes que falham**

`Backend/src/servicos/mapaCorredores.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traduzirEstado, validarMapaEstilo, montarRespostaMapa } from './mapaCorredores.js';

test('traduzirEstado junta alugado e funcionario em ocupado', () => {
    assert.equal(traduzirEstado('disponivel'), 'livre');
    assert.equal(traduzirEstado('alugado'), 'ocupado');
    assert.equal(traduzirEstado('funcionario'), 'ocupado');
    assert.equal(traduzirEstado('manutencao'), 'manutencao');
});

test('traduzirEstado trata status desconhecido como ocupado, para não vender', () => {
    assert.equal(traduzirEstado('qualquer'), 'ocupado');
    assert.equal(traduzirEstado(undefined), 'ocupado');
});

test('validarMapaEstilo aceita null para voltar ao padrão', () => {
    assert.deepEqual(validarMapaEstilo(null), { valido: true, valor: null });
});

test('validarMapaEstilo normaliza as cores em maiúsculas', () => {
    const resultado = validarMapaEstilo({ modo: 'personalizado', parede: '#16243d', corredores: { 1: '#f5c542' } });
    assert.deepEqual(resultado, {
        valido: true,
        valor: { modo: 'personalizado', parede: '#16243D', corredores: { 1: '#F5C542' } }
    });
});

test('validarMapaEstilo recusa modo e cor inválidos', () => {
    assert.equal(validarMapaEstilo({ modo: 'neon' }).valido, false);
    assert.equal(validarMapaEstilo({ parede: 'azul' }).valido, false);
    assert.equal(validarMapaEstilo({ corredores: { 1: '#FFF' } }).valido, false);
    assert.equal(validarMapaEstilo([]).valido, false);
});

test('validarMapaEstilo ignora campos que não são do mapa', () => {
    assert.deepEqual(validarMapaEstilo({ modo: 'escuro', script: 'x' }).valor, { modo: 'escuro' });
});

test('montarRespostaMapa devolve só a lista vazia quando não há corredores', () => {
    assert.deepEqual(
        montarRespostaMapa({ planta: null, corredores: [], itens: [], armarios: [], usuarioId: 'u1', estilo: null }),
        { corredores: [] }
    );
});

test('montarRespostaMapa ordena, aplica a cor do admin e esconde o dono dos armários', () => {
    const resposta = montarRespostaMapa({
        planta: { school_id: 'e1', colunas_deitada: '1fr' },
        corredores: [
            { id: 'c2', codigo: '2', nome: 'Corredor 2', nome_curto: null, sigla: '2', cor: '#F28A30', ordem: 2, area_deitada: 'a', area_estreita: 'b' },
            { id: 'c1', codigo: '1', nome: 'Corredor 1', nome_curto: 'Corredor', sigla: '1', cor: '#F5C542', ordem: 1, area_deitada: 'c', area_estreita: 'd' }
        ],
        itens: [
            { id: 'i2', corredor_id: 'c1', ordem: 2, tipo: 'bloco', numero: null, rotulo: null, variante: null, tom: 'claro', larguras: [30, 30] },
            { id: 'i1', corredor_id: 'c1', ordem: 1, tipo: 'porta', numero: '01', rotulo: null, variante: null, tom: null, larguras: null }
        ],
        armarios: [
            { id: 'a1', nome: '001', corredor: '1', status: 'disponivel', usuario_id: null, item_id: 'i2', coluna: 0, linha: 0 },
            { id: 'a2', nome: '002', corredor: '1', status: 'alugado', usuario_id: 'u1', item_id: 'i2', coluna: 1, linha: 0 },
            { id: 'a3', nome: '003', corredor: '1', status: 'alugado', usuario_id: 'u9', item_id: 'i2', coluna: 0, linha: 1 }
        ],
        usuarioId: 'u1',
        estilo: { modo: 'escuro', corredores: { 1: '#111111' } }
    });

    assert.deepEqual(resposta.corredores.map(c => c.id), ['c1', 'c2']);
    assert.equal(resposta.corredores[0].cor, '#111111');
    assert.equal(resposta.corredores[1].cor, '#F28A30');
    assert.deepEqual(resposta.corredores[0].itens.map(i => i.id), ['i1', 'i2']);
    assert.deepEqual(resposta.armarios.map(a => [a.id, a.estado, a.meu]), [
        ['a1', 'livre', false], ['a2', 'ocupado', true], ['a3', 'ocupado', false]
    ]);
    for (const armario of resposta.armarios) {
        assert.equal('usuario_id' in armario, false);
        assert.equal('status' in armario, false);
    }
    assert.equal(resposta.planta.school_id, undefined);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd Backend && npm test`
Expected: FAIL com `Cannot find module ... mapaCorredores.js`

- [ ] **Step 4: Implementar**

`Backend/src/servicos/mapaCorredores.js`:

```js
// Regras do mapa de corredores que não dependem do banco: o que o aluno pode
// ver de cada armário, e o que o admin pode gravar como estilo.

const ESTADO_POR_STATUS = {
    disponivel: 'livre',
    alugado: 'ocupado',
    funcionario: 'ocupado',
    manutencao: 'manutencao'
};

// Status que o mapa não conhece vira ocupado: na dúvida, o armário não é vendido.
export const traduzirEstado = (status) => ESTADO_POR_STATUS[status] ?? 'ocupado';

const FORMATO_HEX = /^#[0-9a-fA-F]{6}$/;
export const MODOS_DO_MAPA = ['escuro', 'claro', 'personalizado'];
export const CORES_DO_MAPA = ['fundo', 'parede', 'faixa', 'vidro', 'porta', 'armario_claro', 'armario_escuro', 'selecao'];

const corValida = (cor) => typeof cor === 'string' && FORMATO_HEX.test(cor.trim());

export const validarMapaEstilo = (estilo) => {
    if (estilo === null) return { valido: true, valor: null };
    if (!estilo || typeof estilo !== 'object' || Array.isArray(estilo)) {
        return { valido: false, erro: 'O estilo do mapa precisa ser um objeto.' };
    }

    const valor = {};

    if ('modo' in estilo) {
        if (!MODOS_DO_MAPA.includes(estilo.modo)) {
            return { valido: false, erro: `O modo do mapa precisa ser um de: ${MODOS_DO_MAPA.join(', ')}.` };
        }
        valor.modo = estilo.modo;
    }

    for (const campo of CORES_DO_MAPA) {
        if (!(campo in estilo)) continue;
        if (!corValida(estilo[campo])) {
            return { valido: false, erro: `A cor ${campo} do mapa precisa estar no formato #RRGGBB.` };
        }
        valor[campo] = estilo[campo].trim().toUpperCase();
    }

    if ('corredores' in estilo) {
        const cores = estilo.corredores;
        if (!cores || typeof cores !== 'object' || Array.isArray(cores)) {
            return { valido: false, erro: 'As cores dos corredores precisam ser um objeto.' };
        }
        valor.corredores = {};
        for (const [codigo, cor] of Object.entries(cores)) {
            if (!corValida(cor)) {
                return { valido: false, erro: `A cor do corredor ${codigo} precisa estar no formato #RRGGBB.` };
            }
            valor.corredores[codigo] = cor.trim().toUpperCase();
        }
    }

    return { valido: true, valor };
};

const porOrdem = (a, b) => a.ordem - b.ordem;

export const montarRespostaMapa = ({ planta, corredores, itens, armarios, usuarioId, estilo }) => {
    if (!corredores.length) return { corredores: [] };

    const coresDoAdmin = estilo?.corredores ?? {};
    const itensPorCorredor = new Map();

    for (const item of [...itens].sort(porOrdem)) {
        if (!itensPorCorredor.has(item.corredor_id)) itensPorCorredor.set(item.corredor_id, []);
        itensPorCorredor.get(item.corredor_id).push({
            id: item.id,
            tipo: item.tipo,
            numero: item.numero,
            rotulo: item.rotulo,
            variante: item.variante,
            tom: item.tom,
            larguras: item.larguras
        });
    }

    const { school_id: _escola, ...plantaPublica } = planta ?? {};

    return {
        planta: plantaPublica,
        estilo: estilo ?? null,
        corredores: [...corredores].sort(porOrdem).map((c) => ({
            id: c.id,
            codigo: c.codigo,
            nome: c.nome,
            nome_curto: c.nome_curto,
            sigla: c.sigla,
            cor: coresDoAdmin[c.codigo] ?? c.cor,
            area_deitada: c.area_deitada,
            area_estreita: c.area_estreita,
            itens: itensPorCorredor.get(c.id) ?? []
        })),
        // O aluno sabe qual armário é o dele, nunca de quem são os outros.
        armarios: armarios
            .filter((a) => a.item_id)
            .map((a) => ({
                id: a.id,
                nome: a.nome,
                corredor: a.corredor,
                item_id: a.item_id,
                coluna: a.coluna,
                linha: a.linha,
                estado: traduzirEstado(a.status),
                meu: Boolean(usuarioId) && a.usuario_id === usuarioId
            }))
    };
};
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd Backend && npm test`
Expected: PASS, 8 testes.

- [ ] **Step 6: Commit**

```bash
git add Backend/package.json Backend/src/servicos/mapaCorredores.js Backend/src/servicos/mapaCorredores.test.js
git commit -m "feat(mapa): regras do mapa de corredores no backend"
```

---

### Task 2: Migração do banco

**Files:**
- Create: `Backend/sql/2026-09-16-mapa-corredores.sql`

**Interfaces:**
- Produces: tabelas `plantas`, `corredores`, `corredor_itens`; colunas `lockers.item_id`, `lockers.coluna`, `lockers.linha`; coluna `schools.mapa_estilo`. Nomes de coluna exatamente como no spec, seção 1.

- [ ] **Step 1: Escrever a migração**

`Backend/sql/2026-09-16-mapa-corredores.sql`:

```sql
-- Mapa de corredores: planta, corredores e a parede de cada um.
--
-- POR QUE TABELAS E NÃO UM JSON NA ESCOLA. Cada armário passa a apontar para
-- o bloco onde está e para a coluna e a linha dentro dele. Com isso a parede
-- mostra o armário no lugar físico certo mesmo quando a numeração da escola
-- pula (o 577-588 do Bento Quirino fica entre o 256 e o 257).
--
-- Nenhuma escola muda de tela ao aplicar esta migração: sem linhas em
-- `corredores`, o portal continua mostrando a grade de armários.

CREATE TABLE IF NOT EXISTS plantas (
  school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  colunas_deitada TEXT NOT NULL,
  linhas_deitada TEXT NOT NULL,
  colunas_estreita TEXT NOT NULL,
  linhas_estreita TEXT NOT NULL,
  patio_area_deitada TEXT NOT NULL,
  patio_area_estreita TEXT NOT NULL,
  patio_recuo_deitada TEXT,
  patio_recuo_estreita TEXT
);

CREATE TABLE IF NOT EXISTS corredores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  nome_curto TEXT,
  sigla TEXT NOT NULL,
  cor TEXT NOT NULL CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem SMALLINT NOT NULL DEFAULT 0,
  area_deitada TEXT NOT NULL,
  area_estreita TEXT NOT NULL,
  UNIQUE (school_id, codigo)
);

CREATE TABLE IF NOT EXISTS corredor_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corredor_id UUID NOT NULL REFERENCES corredores(id) ON DELETE CASCADE,
  ordem SMALLINT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'portal', 'porta', 'bloco', 'fundo', 'fim',
    'hidrante', 'extintor', 'lixeira', 'mural', 'quadro', 'rampa'
  )),
  numero TEXT,
  rotulo TEXT,
  variante TEXT CHECK (variante IS NULL OR variante IN ('laboratorio', 'estoque', 'vidro')),
  tom TEXT CHECK (tom IS NULL OR tom IN ('claro', 'escuro')),
  larguras SMALLINT[],
  -- bloco sem tom ou sem colunas não tem como ser desenhado
  CHECK (tipo <> 'bloco' OR (tom IS NOT NULL AND cardinality(larguras) > 0)),
  UNIQUE (corredor_id, ordem)
);

CREATE INDEX IF NOT EXISTS corredores_school_idx ON corredores (school_id);

ALTER TABLE lockers ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES corredor_itens(id) ON DELETE SET NULL;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS coluna SMALLINT;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS linha SMALLINT;

-- Dois armários não ocupam a mesma porta.
CREATE UNIQUE INDEX IF NOT EXISTS lockers_posicao_unica
  ON lockers (item_id, coluna, linha)
  WHERE item_id IS NOT NULL;

ALTER TABLE schools ADD COLUMN IF NOT EXISTS mapa_estilo JSONB;

COMMENT ON COLUMN schools.mapa_estilo IS
  'Cores do mapa de corredores escolhidas pelo admin. NULL = tema escuro padrão.';

-- Mesmo regime de lockers e rentals: só o backend, com a service role, acessa.
ALTER TABLE plantas ENABLE ROW LEVEL SECURITY;
ALTER TABLE corredores ENABLE ROW LEVEL SECURITY;
ALTER TABLE corredor_itens ENABLE ROW LEVEL SECURITY;

-- Conferência.
SELECT table_name FROM information_schema.tables
 WHERE table_name IN ('plantas', 'corredores', 'corredor_itens');
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'lockers' AND column_name IN ('item_id', 'coluna', 'linha');
```

- [ ] **Step 2: Revisar contra o spec**

Conferir, coluna por coluna, com a seção 1 do spec: nomes, tipos, `ON DELETE`, os `UNIQUE` e o índice parcial. A migração precisa rodar duas vezes sem erro (todo comando tem `IF NOT EXISTS`).

- [ ] **Step 3: Commit**

```bash
git add Backend/sql/2026-09-16-mapa-corredores.sql
git commit -m "feat(mapa): tabelas de planta, corredores e parede"
```

A aplicação no Supabase fica para a Task 12, junto com a carga.

---

### Task 3: Dados e carga do Bento Quirino

**Files:**
- Create: `Backend/scripts/mapas/bentoQuirino.js`
- Create: `Backend/scripts/gerarSqlMapa.js`
- Create: `Backend/scripts/gerarSqlMapa.test.js`
- Create (gerado): `Backend/sql/2026-09-16-mapa-bento-quirino.sql`

**Interfaces:**
- Consumes: tabelas e colunas da Task 2.
- Produces:
  - `grade(inicio: number, colunas: number, linhas: number): number[][]` (numeração por linha; `saida[coluna][linha]`)
  - `posicoesDoBloco(colunas: number[][]): { numero, coluna, linha }[]`
  - `gerarSqlMapa(mapa): string`
  - formato do módulo de mapa: `{ codigoEscola, planta: {...colunas da tabela plantas}, corredores: [{ codigo, nome, nome_curto, sigla, cor, area_deitada, area_estreita, itens: [{ tipo, numero?, rotulo?, variante?, tom?, larguras?, colunas? }] }] }`

- [ ] **Step 1: Escrever os testes que falham**

`Backend/scripts/gerarSqlMapa.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grade, posicoesDoBloco, gerarSqlMapa, sqlTexto } from './gerarSqlMapa.js';

test('grade numera por linha, da esquerda para a direita', () => {
    assert.deepEqual(grade(85, 4, 3), [[85, 89, 93], [86, 90, 94], [87, 91, 95], [88, 92, 96]]);
});

test('posicoesDoBloco aceita colunas de alturas diferentes', () => {
    assert.deepEqual(posicoesDoBloco([[533, 537], [535]]), [
        { numero: 533, coluna: 0, linha: 0 },
        { numero: 537, coluna: 0, linha: 1 },
        { numero: 535, coluna: 1, linha: 0 }
    ]);
});

test('sqlTexto escapa aspas e trata vazio como NULL', () => {
    assert.equal(sqlTexto("Sala d'água"), "'Sala d''água'");
    assert.equal(sqlTexto(null), 'NULL');
    assert.equal(sqlTexto(undefined), 'NULL');
});

const mapaPequeno = {
    codigoEscola: 'etec-teste',
    planta: {
        colunas_deitada: '1fr', linhas_deitada: '1fr', colunas_estreita: '1fr', linhas_estreita: '1fr',
        patio_area_deitada: '1 / 1 / 2 / 2', patio_area_estreita: '1 / 1 / 2 / 2',
        patio_recuo_deitada: null, patio_recuo_estreita: null
    },
    corredores: [{
        codigo: '1', nome: 'Corredor 1', nome_curto: 'Corredor', sigla: '1', cor: '#F5C542',
        area_deitada: '1 / 2 / 2 / 3', area_estreita: '1 / 2 / 2 / 3',
        itens: [
            { tipo: 'porta', numero: '01' },
            { tipo: 'bloco', tom: 'claro', larguras: [30, 30], colunas: [[1, 3], [2, 4]] }
        ]
    }]
};

test('gerarSqlMapa cria corredor, itens e liga armários por número', () => {
    const sql = gerarSqlMapa(mapaPequeno);
    assert.match(sql, /WHERE codigo = 'etec-teste'/);
    assert.match(sql, /INSERT INTO plantas/);
    assert.match(sql, /INSERT INTO corredores[\s\S]*'Corredor 1'/);
    assert.match(sql, /\(v_corredor, 1, 'porta', '01', NULL, NULL, NULL, NULL\)/);
    assert.match(sql, /\(v_corredor, 2, 'bloco', NULL, NULL, NULL, 'claro', ARRAY\[30, 30\]::smallint\[\]\)/);
    assert.match(sql, /VALUES \(1, 0, 0\), \(3, 0, 1\), \(2, 1, 0\), \(4, 1, 1\)/);
    assert.equal((sql.match(/UPDATE lockers l SET item_id/g) || []).length, 1);
    assert.match(sql, /Conferência 3/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd Backend && npm test`
Expected: FAIL com `Cannot find module ... gerarSqlMapa.js`

- [ ] **Step 3: Implementar o gerador**

`Backend/scripts/gerarSqlMapa.js`:

```js
// Gera o SQL de carga de um mapa de corredores a partir de um módulo de dados.
//
// Uso: node scripts/gerarSqlMapa.js scripts/mapas/bentoQuirino.js sql/2026-09-16-mapa-bento-quirino.sql
//
// O mapa vive em JS e não direto no SQL porque são centenas de números de
// armário: escrever cada posição à mão num VALUES é onde o erro entra.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// numeração por linha, da esquerda para a direita, igual às etiquetas da APM
export function grade(inicio, colunas, linhas) {
    const saida = Array.from({ length: colunas }, () => []);
    let numero = inicio;
    for (let linha = 0; linha < linhas; linha++) {
        for (let coluna = 0; coluna < colunas; coluna++) saida[coluna].push(numero++);
    }
    return saida;
}

export function posicoesDoBloco(colunas) {
    const saida = [];
    colunas.forEach((numeros, coluna) => {
        numeros.forEach((numero, linha) => saida.push({ numero, coluna, linha }));
    });
    return saida;
}

export const sqlTexto = (valor) =>
    valor === null || valor === undefined ? 'NULL' : `'${String(valor).replace(/'/g, "''")}'`;

const numeroDoNome = (alias) => `NULLIF(regexp_replace(${alias}.nome, '[^0-9]', '', 'g'), '')::int`;

function sqlItem(item, ordem) {
    const larguras = item.larguras ? `ARRAY[${item.larguras.join(', ')}]::smallint[]` : 'NULL';
    const valores = [
        'v_corredor', ordem, sqlTexto(item.tipo), sqlTexto(item.numero), sqlTexto(item.rotulo),
        sqlTexto(item.variante), sqlTexto(item.tom), larguras
    ].join(', ');
    let sql = `  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)\n`
        + `  VALUES (${valores}) RETURNING id INTO v_item;\n`;

    if (item.tipo === 'bloco') {
        const posicoes = posicoesDoBloco(item.colunas)
            .map(({ numero, coluna, linha }) => `(${numero}, ${coluna}, ${linha})`)
            .join(', ');
        // Número repetido na escola não é ligado: não há como saber qual dos dois está nesta porta.
        sql += `  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha\n`
            + `    FROM (VALUES ${posicoes}) AS p(numero, coluna, linha)\n`
            + `   WHERE l.school_id = v_escola\n`
            + `     AND ${numeroDoNome('l')} = p.numero\n`
            + `     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND ${numeroDoNome('d')} = p.numero);\n`;
    }
    return sql;
}

export function gerarSqlMapa(mapa) {
    const codigo = sqlTexto(mapa.codigoEscola);
    const p = mapa.planta;
    const numeros = mapa.corredores
        .flatMap((c) => c.itens)
        .filter((i) => i.tipo === 'bloco')
        .flatMap((i) => posicoesDoBloco(i.colunas).map((pos) => pos.numero))
        .sort((a, b) => a - b);

    let sql = `-- Carga do mapa de corredores da escola ${mapa.codigoEscola}.\n`
        + `-- Gerado por Backend/scripts/gerarSqlMapa.js. Não edite à mão: mude os dados e gere de novo.\n`
        + `-- Rodar DEPOIS de 2026-09-16-mapa-corredores.sql. Pode ser rodado de novo: recarrega o mapa inteiro.\n\n`
        + `BEGIN;\n\nDO $$\nDECLARE\n  v_escola UUID;\n  v_corredor UUID;\n  v_item UUID;\nBEGIN\n`
        + `  SELECT id INTO v_escola FROM schools WHERE codigo = ${codigo};\n`
        + `  IF v_escola IS NULL THEN RAISE EXCEPTION 'Escola ${mapa.codigoEscola} não encontrada.'; END IF;\n\n`
        + `  UPDATE lockers SET item_id = NULL, coluna = NULL, linha = NULL WHERE school_id = v_escola;\n`
        + `  DELETE FROM corredores WHERE school_id = v_escola;\n\n`
        + `  INSERT INTO plantas (school_id, colunas_deitada, linhas_deitada, colunas_estreita, linhas_estreita,\n`
        + `    patio_area_deitada, patio_area_estreita, patio_recuo_deitada, patio_recuo_estreita)\n`
        + `  VALUES (v_escola, ${[p.colunas_deitada, p.linhas_deitada, p.colunas_estreita, p.linhas_estreita,
            p.patio_area_deitada, p.patio_area_estreita, p.patio_recuo_deitada, p.patio_recuo_estreita].map(sqlTexto).join(', ')})\n`
        + `  ON CONFLICT (school_id) DO UPDATE SET\n`
        + `    colunas_deitada = EXCLUDED.colunas_deitada, linhas_deitada = EXCLUDED.linhas_deitada,\n`
        + `    colunas_estreita = EXCLUDED.colunas_estreita, linhas_estreita = EXCLUDED.linhas_estreita,\n`
        + `    patio_area_deitada = EXCLUDED.patio_area_deitada, patio_area_estreita = EXCLUDED.patio_area_estreita,\n`
        + `    patio_recuo_deitada = EXCLUDED.patio_recuo_deitada, patio_recuo_estreita = EXCLUDED.patio_recuo_estreita;\n`;

    mapa.corredores.forEach((c, i) => {
        sql += `\n  -- ${c.nome}\n`
            + `  INSERT INTO corredores (school_id, codigo, nome, nome_curto, sigla, cor, ordem, area_deitada, area_estreita)\n`
            + `  VALUES (v_escola, ${[c.codigo, c.nome, c.nome_curto, c.sigla, c.cor].map(sqlTexto).join(', ')}, ${i + 1}, `
            + `${sqlTexto(c.area_deitada)}, ${sqlTexto(c.area_estreita)}) RETURNING id INTO v_corredor;\n`;
        c.itens.forEach((item, ordem) => { sql += sqlItem(item, ordem + 1); });
    });

    sql += `END $$;\n\nCOMMIT;\n\n`
        + `-- Conferência 1: armários da escola que ficaram sem lugar na parede.\n`
        + `SELECT l.nome, l.corredor, l.status FROM lockers l JOIN schools s ON s.id = l.school_id\n`
        + ` WHERE s.codigo = ${codigo} AND l.item_id IS NULL ORDER BY ${numeroDoNome('l')} NULLS LAST;\n\n`
        + `-- Conferência 2: portas da parede que não encontraram armário no banco.\n`
        + `SELECT e.numero FROM (VALUES ${numeros.map((n) => `(${n})`).join(', ')}) AS e(numero)\n`
        + ` WHERE NOT EXISTS (SELECT 1 FROM lockers l JOIN schools s ON s.id = l.school_id\n`
        + `                    WHERE s.codigo = ${codigo} AND l.item_id IS NOT NULL AND ${numeroDoNome('l')} = e.numero)\n`
        + ` ORDER BY e.numero;\n\n`
        + `-- Conferência 3: números repetidos na escola (não foram ligados).\n`
        + `SELECT ${numeroDoNome('l')} AS numero, count(*) FROM lockers l JOIN schools s ON s.id = l.school_id\n`
        + ` WHERE s.codigo = ${codigo} GROUP BY 1 HAVING count(*) > 1 ORDER BY 1;\n`;

    return sql;
}

const chamadoDireto = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (chamadoDireto) {
    const [, , moduloDoMapa, arquivoDeSaida] = process.argv;
    const { default: mapa } = await import(pathToFileURL(resolve(moduloDoMapa)).href);
    writeFileSync(arquivoDeSaida, gerarSqlMapa(mapa));
    console.log(`SQL gerado em ${arquivoDeSaida}`);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd Backend && npm test`
Expected: PASS (testes da Task 1 + 4 novos).

- [ ] **Step 5: Escrever os dados do Bento Quirino**

`Backend/scripts/mapas/bentoQuirino.js` — os itens são os do protótipo aprovado (`docs/prototipos/mapa-corredores.html`, constante `ESCOLAS.bentao`), com três trocas de formato: laboratório vira `variante: 'laboratorio'`, a porta sem número do Corredor 3 vira `variante: 'estoque'`, e o fim do Corredor 2 vira `variante: 'vidro'`.

```js
// Mapa do Bento Quirino levantado pelas fotos de 20/08/2026.
// Blocos marcados com EST têm numeração deduzida: a conferência do SQL gerado
// diz quais números não bateram com o banco.
import { grade } from '../gerarSqlMapa.js';

const LARGURA = { estreito: 30, medio: 38, largo: 46 };
const EST = { estimado: true };

const bloco = (tom, largura, colunas, extra = {}) => ({
    tipo: 'bloco',
    tom,
    larguras: Array.isArray(largura) ? largura : colunas.map(() => LARGURA[largura]),
    colunas,
    ...extra
});
const sala = (numero) => ({ tipo: 'porta', numero });
const laboratorio = (rotulo) => ({ tipo: 'porta', variante: 'laboratorio', rotulo });
const marco = (tipo, extra = {}) => ({ tipo, ...extra });

export default {
    codigoEscola: 'etec-043',
    planta: {
        colunas_deitada: 'minmax(0, 1fr) minmax(0, .9fr) minmax(0, 1.25fr)',
        linhas_deitada: 'repeat(6, minmax(0, 1fr))',
        colunas_estreita: 'minmax(0, 1fr) 34px minmax(0, 1.6fr)',
        linhas_estreita: 'repeat(6, minmax(0, 1fr))',
        patio_area_deitada: '1 / 1 / 7 / 3',
        patio_area_estreita: '1 / 1 / 7 / 3',
        patio_recuo_deitada: 'calc((100% - 14px) / 1.9 + 14px)',
        patio_recuo_estreita: 'calc(100% - 34px)'
    },
    corredores: [
        {
            codigo: '1', nome: 'Corredor 1', nome_curto: 'Corredor', sigla: '1', cor: '#F5C542',
            area_deitada: '5 / 3 / 7 / 4', area_estreita: '5 / 3 / 7 / 4',
            itens: [
                marco('portal'),
                sala('01'),
                bloco('claro', 'estreito', grade(1, 4, 5), EST),
                sala('02'),
                bloco('escuro', 'estreito', grade(21, 4, 5), EST),
                bloco('claro', 'estreito', grade(41, 4, 5), EST),
                sala('03'),
                marco('lixeira'),
                bloco('claro', 'estreito', grade(61, 4, 6), EST),
                bloco('claro', 'largo', grade(85, 4, 3)),
                bloco('escuro', 'medio', grade(97, 4, 4), EST),
                sala('04'),
                marco('hidrante'),
                bloco('escuro', 'estreito', grade(113, 6, 5), EST),
                marco('extintor'),
                sala('05'),
                bloco('claro', 'estreito', grade(143, 2, 5), EST),
                bloco('escuro', 'largo', grade(153, 4, 2)),
                bloco('escuro', 'largo', grade(161, 4, 2), EST),
                bloco('claro', 'medio', grade(169, 4, 4)),
                sala('06'),
                bloco('escuro', 'largo', grade(189, 4, 3)),
                sala('07'),
                marco('fundo')
            ]
        },
        {
            codigo: '2', nome: 'Corredor 2', nome_curto: 'Corredor', sigla: '2', cor: '#F28A30',
            area_deitada: '3 / 3 / 5 / 4', area_estreita: '3 / 3 / 5 / 4',
            itens: [
                marco('portal'),
                sala('08'),
                bloco('escuro', 'medio', grade(205, 4, 4)),
                bloco('escuro', 'estreito', grade(221, 4, 5), EST),
                bloco('claro', 'estreito', grade(241, 4, 4), EST),
                bloco('claro', 'estreito', grade(589, 4, 4), EST),
                bloco('claro', 'largo', grade(577, 2, 2)),
                bloco('claro', 'largo', grade(585, 2, 2)),
                sala('09'),
                bloco('escuro', 'estreito', grade(257, 4, 5)),
                bloco('escuro', 'estreito', grade(277, 4, 5), EST),
                bloco('claro', 'estreito', grade(297, 2, 5), EST),
                marco('quadro'),
                sala('10'),
                bloco('claro', 'estreito', grade(307, 4, 5), EST),
                bloco('escuro', 'estreito', grade(327, 4, 5), EST),
                sala('11'),
                marco('hidrante'),
                marco('extintor'),
                bloco('escuro', 'estreito', grade(347, 4, 4), EST),
                bloco('escuro', 'estreito', grade(363, 4, 4), EST),
                marco('lixeira'),
                sala('12'),
                // o Salão Nobre fecha o corredor de frente, não fica na parede das salas
                marco('fundo', { variante: 'vidro', rotulo: 'Salão Nobre' })
            ]
        },
        {
            codigo: '3', nome: 'Corredor 3', nome_curto: 'Corredor', sigla: '3', cor: '#E5484D',
            area_deitada: '1 / 3 / 3 / 4', area_estreita: '1 / 3 / 3 / 4',
            itens: [
                marco('portal'),
                marco('mural'),
                marco('extintor'),
                sala('13'),
                bloco('claro', 'estreito', grade(379, 4, 5), EST),
                bloco('escuro', 'largo', grade(399, 2, 3), EST),
                marco('hidrante'),
                sala('14'),
                marco('lixeira'),
                { tipo: 'porta', variante: 'estoque' },
                bloco('claro', 'largo', grade(569, 2, 3)),
                bloco('escuro', 'medio', grade(405, 4, 4)),
                bloco('escuro', 'estreito', grade(421, 4, 5), EST),
                bloco('claro', 'estreito', grade(441, 4, 5), EST),
                bloco('escuro', 'largo', grade(461, 2, 4), EST),
                bloco('claro', 'medio', grade(469, 4, 4)),
                sala('15'),
                marco('fundo', { numero: '16' })
            ]
        },
        {
            codigo: 'mecanica', nome: 'Mecânica', nome_curto: null, sigla: 'M', cor: '#3DBE6E',
            area_deitada: '1 / 1 / 4 / 2', area_estreita: '1 / 1 / 4 / 2',
            itens: [
                marco('rampa'),
                marco('extintor'),
                laboratorio('Ciências'),
                marco('quadro'),
                bloco('claro', 'estreito', grade(489, 2, 4)),
                bloco('claro', [36, 36, 44, 44], [[497, 499, 501, 503], [498, 500, 502, 504], [505, 507, 509], [506, 508, 510]]),
                sala('18'),
                bloco('claro', 'estreito', grade(513, 4, 5)),
                bloco('claro', [34, 34, 46, 46], [[533, 537, 541, 545], [534, 538, 542, 546], [535, 539, 543], [536, 540, 544]]),
                marco('fim')
            ]
        }
    ]
};
```

O bloco 297–306 aparecia "em manutenção" no protótipo só como exemplo; aqui não leva status, porque o status real vem de `lockers.status`.

- [ ] **Step 6: Gerar o SQL e conferir**

Run:
```bash
cd Backend && node scripts/gerarSqlMapa.js scripts/mapas/bentoQuirino.js sql/2026-09-16-mapa-bento-quirino.sql
grep -c "INSERT INTO corredores" sql/2026-09-16-mapa-bento-quirino.sql
grep -c "UPDATE lockers l SET item_id" sql/2026-09-16-mapa-bento-quirino.sql
```
Expected: `SQL gerado em ...`, depois `4` e `37` (blocos: Corredor 1 = 12, Corredor 2 = 13, Corredor 3 = 8, Mecânica = 4).

- [ ] **Step 7: Commit**

```bash
git add Backend/scripts Backend/sql/2026-09-16-mapa-bento-quirino.sql
git commit -m "feat(mapa): carga do mapa do Bento Quirino gerada a partir das fotos"
```

---

### Task 4: Endpoint do mapa e estilo na escola

**Files:**
- Modify: `Backend/src/controladores/armariosControlador.js` (novo export `obterMapa`, depois de `listarArmarios`)
- Modify: `Backend/src/rotas/armarios.js`
- Modify: `Backend/src/controladores/escolasControlador.js`

**Interfaces:**
- Consumes: `montarRespostaMapa`, `validarMapaEstilo` (Task 1).
- Produces: `GET /armarios/escola/:schoolCode/mapa` com a resposta do spec, seção 2; `schools.mapa_estilo` gravável pelo admin e presente no contrato público da escola.

- [ ] **Step 1: Controlador**

Em `Backend/src/controladores/armariosControlador.js`, no topo junto dos imports:

```js
import { montarRespostaMapa } from '../servicos/mapaCorredores.js';
```

Logo depois de `listarArmarios`:

```js
// MAPA DE CORREDORES DA ESCOLA (planta, parede e armários posicionados)
export const obterMapa = async (req, res) => {
    const { schoolCode } = req.params;

    try {
        const schoolId = await obterIdEscolaPorCodigo(schoolCode);
        if (!schoolId) {
            return res.status(404).json({ error: `Instituição com o código '${schoolCode}' não foi encontrada.` });
        }

        if (req.user.role !== 'superadmin' && schoolId !== req.user.school_id) {
            return res.status(403).json({ error: 'Você só pode consultar armários da sua própria instituição.' });
        }

        const { data: corredores, error: erroCorredores } = await supabase
            .from('corredores')
            .select('*')
            .eq('school_id', schoolId);

        // 42P01 = tabela inexistente. Antes da migração rodar, a escola simplesmente
        // não tem mapa e o portal continua na grade.
        if (erroCorredores?.code === '42P01') return res.json({ corredores: [] });
        if (erroCorredores) throw erroCorredores;
        if (!corredores.length) return res.json({ corredores: [] });

        const [planta, itens, armarios, escola] = await Promise.all([
            supabase.from('plantas').select('*').eq('school_id', schoolId).maybeSingle(),
            supabase.from('corredor_itens').select('*').in('corredor_id', corredores.map((c) => c.id)),
            supabase
                .from('lockers')
                .select('id, nome, corredor, status, usuario_id, item_id, coluna, linha')
                .eq('school_id', schoolId)
                .not('item_id', 'is', null),
            supabase.from('schools').select('mapa_estilo').eq('id', schoolId).maybeSingle()
        ]);

        for (const consulta of [planta, itens, armarios, escola]) {
            if (consulta.error) throw consulta.error;
        }

        res.json(montarRespostaMapa({
            planta: planta.data,
            corredores,
            itens: itens.data,
            armarios: armarios.data,
            usuarioId: req.user.id,
            estilo: escola.data?.mapa_estilo ?? null
        }));
    } catch (err) {
        console.error('Erro ao montar o mapa:', err.message);
        responderErro(res, err, 'armarios');
    }
};
```

- [ ] **Step 2: Rota**

Em `Backend/src/rotas/armarios.js`, acrescentar `obterMapa` ao import e, logo depois da rota de leitura existente:

```js
router.get('/escola/:schoolCode/mapa', verificarToken, obterMapa);
```

- [ ] **Step 3: Estilo do mapa na escola**

Em `Backend/src/controladores/escolasControlador.js`:

1. Import no topo:

```js
import { validarMapaEstilo } from '../servicos/mapaCorredores.js';
```

2. Em `CAMPOS_EDITAVEIS_ADMIN`, depois de `'tema_modo',`:

```js
  // Cores do mapa de corredores. Validadas em validarMapaEstilo antes de gravar.
  'mapa_estilo',
```

3. Em `atualizarEscola`, logo depois do bloco que retorna `erroDeIdentidade`:

```js
  if ('mapa_estilo' in camposParaAtualizar) {
    const estilo = validarMapaEstilo(camposParaAtualizar.mapa_estilo);
    if (!estilo.valido) {
      return res.status(400).json({ error: estilo.erro });
    }
    camposParaAtualizar.mapa_estilo = estilo.valor;
  }
```

4. Em `projetarEscolaPublica`, depois de `tema_modo`:

```js
    // Cores do mapa. Públicas como o resto do tema; NULL = escuro padrão.
    mapa_estilo: escola.mapa_estilo ?? null,
```

- [ ] **Step 4: Checar sintaxe e testes**

Run:
```bash
cd Backend && node --check src/controladores/armariosControlador.js && node --check src/controladores/escolasControlador.js && node --check src/rotas/armarios.js && npm test
```
Expected: sem saída dos `--check`, testes PASS.

- [ ] **Step 5: Subir o backend e bater na rota**

Run: `cd Backend && npm run dev` (em outro terminal) e `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/armarios/escola/etec-043/mapa`
Expected: `401` (rota existe e exige token). Sem service key local, a resposta com dados só é conferida na Task 12.

- [ ] **Step 6: Commit**

```bash
git add Backend/src/controladores/armariosControlador.js Backend/src/rotas/armarios.js Backend/src/controladores/escolasControlador.js
git commit -m "feat(mapa): endpoint do mapa e estilo do mapa na escola"
```

---

### Task 5: Geometria e paleta no front

**Files:**
- Create: `front/src/screens/Home/mapa/geometria.js`
- Create: `front/src/screens/Home/mapa/geometria.test.js`
- Create: `front/src/screens/Home/mapa/estiloMapa.js`
- Create: `front/src/screens/Home/mapa/estiloMapa.test.js`
- Modify: `front/package.json` (script `test`)

**Interfaces:**
- Consumes: formato de `corredores[]` e `armarios[]` do endpoint (Task 4).
- Produces:
  - `montarCorredor(corredor, armarios): Layout`, onde `Layout = { itens: ItemPosicionado[], comprimento: number, paradas: Parada[], salas: string, livres: number }`
  - `ItemPosicionado = item da API + { x, largura }`; se `tipo === 'bloco'`, também `{ colunas: (Armario | null)[][], local: string }`
  - `Parada = { centro, largura, topo, base, tipo: 'bloco' | 'porta', rotulo: string, local: string }`
  - `enquadrar(lay: Layout, largura: number, altura: number, celular: boolean): { escala, tx, ty }[]`
  - constantes `ALTURA = 340`, `MARGEM = 600`
  - `paletaDoMapa(estilo | null): Paleta` e `variaveisCss(paleta): object`
  - `CORES_EDITAVEIS: { campo, titulo }[]`
  - `Paleta` tem as chaves: `fundo, parede, faixa, faixaLinha, vidro, caixilho, cano, porta, batente, piso, pisoJunta, armario_claro, armario_escuro, portal, marcaPlaca, selecao, carta, borda, texto, textoSuave`

- [ ] **Step 1: Script de teste do front**

Em `front/package.json`, dentro de `"scripts"`, depois de `"preview"`:

```json
    "test": "node --test"
```

(Adicionar a vírgula no fim da linha de `"preview"`.)

- [ ] **Step 2: Escrever os testes que falham**

`front/src/screens/Home/mapa/geometria.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarCorredor, enquadrar, MARGEM } from './geometria.js';

const corredor = {
    id: 'c3',
    itens: [
        { id: 'p0', tipo: 'portal' },
        { id: 'p13', tipo: 'porta', numero: '13' },
        { id: 'b1', tipo: 'bloco', tom: 'claro', larguras: [30, 30] },
        { id: 'est', tipo: 'porta', variante: 'estoque' },
        { id: 'b2', tipo: 'bloco', tom: 'escuro', larguras: [46] },
        { id: 'p15', tipo: 'porta', numero: '15' },
        { id: 'f16', tipo: 'fundo', numero: '16' }
    ]
};

const armarios = [
    { id: 'a1', nome: '379', item_id: 'b1', coluna: 0, linha: 0, estado: 'livre', meu: false },
    { id: 'a2', nome: '381', item_id: 'b1', coluna: 0, linha: 1, estado: 'ocupado', meu: false },
    { id: 'a3', nome: '380', item_id: 'b1', coluna: 1, linha: 0, estado: 'livre', meu: false },
    { id: 'a4', nome: '569', item_id: 'b2', coluna: 0, linha: 2, estado: 'manutencao', meu: false },
    { id: 'fora', nome: '001', item_id: 'outro', coluna: 0, linha: 0, estado: 'livre', meu: false }
];

test('posiciona os itens com o espaço menor entre blocos vizinhos', () => {
    const lay = montarCorredor(corredor, armarios);
    const [portal, porta13, bloco1] = lay.itens;
    assert.equal(portal.x, 40);
    assert.equal(porta13.x, portal.x + portal.largura + 28);
    assert.equal(bloco1.x, porta13.x + porta13.largura + 28);
    assert.equal(bloco1.largura, 30 + 30 + 8);
    assert.equal(lay.comprimento, lay.itens.at(-1).x + lay.itens.at(-1).largura);
});

test('monta as colunas do bloco pela coluna e linha de cada armário', () => {
    const lay = montarCorredor(corredor, armarios);
    const bloco1 = lay.itens.find((i) => i.id === 'b1');
    assert.deepEqual(bloco1.colunas.map((col) => col.map((a) => a?.id ?? null)), [['a1', 'a2'], ['a3']]);
    const bloco2 = lay.itens.find((i) => i.id === 'b2');
    assert.deepEqual(bloco2.colunas[0].map((a) => a?.id ?? null), [null, null, 'a4']);
});

test('fim do corredor e estoque não viram parada', () => {
    const lay = montarCorredor(corredor, armarios);
    assert.deepEqual(lay.paradas.map((p) => [p.tipo, p.rotulo]), [
        ['porta', '13'], ['bloco', ''], ['bloco', ''], ['porta', '15']
    ]);
});

test('descreve o local pela última porta com placa e ignora o estoque na contagem de paradas', () => {
    const lay = montarCorredor(corredor, armarios);
    assert.equal(lay.paradas[1].local, 'Perto da Sala 13');
    assert.equal(lay.paradas[2].local, 'Perto do Estoque');
    assert.equal(lay.itens.find((i) => i.id === 'b1').local, 'Perto da Sala 13');
});

test('conta livres só dos armários deste corredor e resume as salas', () => {
    const lay = montarCorredor(corredor, armarios);
    assert.equal(lay.livres, 2);
    assert.equal(lay.salas, 'Salas 13 a 16');
});

test('no celular cada parada cabe inteira na largura, acima da faixa das setas', () => {
    const lay = montarCorredor(corredor, armarios);
    const quadros = enquadrar(lay, 370, 560, true);
    lay.paradas.forEach((p, i) => {
        const { escala, tx } = quadros[i];
        const inicio = tx + (p.centro - p.largura / 2 + MARGEM) * escala;
        const fim = tx + (p.centro + p.largura / 2 + MARGEM) * escala;
        assert.ok(inicio >= 9.9 && fim <= 360.1, `parada ${i} saiu da tela: ${inicio}..${fim}`);
        assert.ok((p.base - p.topo) * escala <= 560 - 82 + 0.1);
    });
});

test('no computador a escala é a mesma para o corredor todo', () => {
    const lay = montarCorredor(corredor, armarios);
    const escalas = new Set(enquadrar(lay, 1300, 520, false).map((q) => q.escala));
    assert.equal(escalas.size, 1);
});
```

`front/src/screens/Home/mapa/estiloMapa.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paletaDoMapa, variaveisCss, CORES_EDITAVEIS } from './estiloMapa.js';

test('sem estilo, a paleta é a escura padrão', () => {
    const paleta = paletaDoMapa(null);
    assert.equal(paleta.parede, '#16243D');
    assert.equal(paleta.texto, '#F2F5FA');
});

test('modo claro troca a base inteira', () => {
    const paleta = paletaDoMapa({ modo: 'claro', parede: '#000000' });
    assert.equal(paleta.parede, '#F3F2EE');
    assert.equal(paleta.texto, '#0A1F44');
});

test('personalizado aplica só as cores editáveis por cima do escuro', () => {
    const paleta = paletaDoMapa({ modo: 'personalizado', parede: '#123456', cano: '#FFFFFF' });
    assert.equal(paleta.parede, '#123456');
    assert.equal(paleta.cano, '#B14238');
});

test('as cores editáveis existem todas na paleta', () => {
    const paleta = paletaDoMapa(null);
    for (const { campo } of CORES_EDITAVEIS) assert.ok(paleta[campo], campo);
});

test('variaveisCss expõe o que os componentes usam', () => {
    const variaveis = variaveisCss(paletaDoMapa(null));
    assert.deepEqual(Object.keys(variaveis).sort(), [
        '--mapa-borda', '--mapa-carta', '--mapa-fundo', '--mapa-selecao', '--mapa-texto', '--mapa-texto-suave'
    ]);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd front && npm test`
Expected: FAIL com `Cannot find module ... geometria.js` e `... estiloMapa.js`

- [ ] **Step 4: Implementar a geometria**

`front/src/screens/Home/mapa/geometria.js`:

```js
// Onde cada coisa fica na parede, em centímetros da parede real, e como a
// câmera enquadra cada parada. Sem React e sem DOM: dá para testar com node.

export const ALTURA = 340;
export const MARGEM = 600;

const JANELA_TOPO = 12;
const JANELA_ALTURA = ALTURA - JANELA_TOPO;
const FAIXA_CONTROLES = 82;

const LARGURA_ITEM = {
    portal: 180, porta: 110, fundo: 150, fim: 90,
    hidrante: 70, extintor: 26, lixeira: 42, mural: 110, quadro: 44, rampa: 210
};

const temNome = (item) => Boolean(item.numero || item.rotulo || item.variante === 'estoque');

export function nomePorta(item) {
    if (item.variante === 'laboratorio') return `Lab. de ${item.rotulo}`;
    if (item.variante === 'estoque') return 'Estoque';
    if (item.rotulo) return item.rotulo;
    return `Sala ${item.numero}`;
}

export function descreverLocal(porta) {
    if (!porta) return 'Entrada do corredor';
    const masculino = porta.variante === 'laboratorio' || porta.variante === 'estoque' || Boolean(porta.rotulo);
    return `${masculino ? 'Perto do' : 'Perto da'} ${nomePorta(porta)}`;
}

function rotuloCurto(item) {
    if (item.variante === 'laboratorio') return 'Lab';
    if (item.rotulo) return item.rotulo.split(' ')[0];
    return item.numero ?? '';
}

export function montarColunas(larguras, armariosDoBloco) {
    return larguras.map((_, coluna) => {
        const daColuna = armariosDoBloco.filter((a) => a.coluna === coluna);
        const linhas = daColuna.reduce((maior, a) => Math.max(maior, a.linha + 1), 0);
        const celulas = Array.from({ length: linhas }, () => null);
        for (const armario of daColuna) celulas[armario.linha] = armario;
        return celulas;
    });
}

export function montarCorredor(corredor, armarios) {
    const idsDoCorredor = new Set(corredor.itens.map((i) => i.id));
    const doCorredor = armarios.filter((a) => idsDoCorredor.has(a.item_id));
    const porItem = new Map();
    for (const armario of doCorredor) {
        if (!porItem.has(armario.item_id)) porItem.set(armario.item_id, []);
        porItem.get(armario.item_id).push(armario);
    }

    const itens = [];
    let x = 40;
    let anterior = null;
    let ultimaPorta = null;

    for (const original of corredor.itens) {
        const item = { ...original };
        if (anterior) x += anterior.tipo === 'bloco' && item.tipo === 'bloco' ? 5 : 28;
        item.x = x;

        if (item.tipo === 'bloco') {
            item.largura = item.larguras.reduce((soma, l) => soma + l, 0) + 8;
            item.colunas = montarColunas(item.larguras, porItem.get(item.id) ?? []);
            item.local = descreverLocal(ultimaPorta);
        } else {
            item.largura = LARGURA_ITEM[item.tipo];
        }

        if ((item.tipo === 'porta' || item.tipo === 'fundo') && temNome(item)) ultimaPorta = item;
        itens.push(item);
        x += item.largura;
        anterior = item;
    }

    const fechado = anterior && (anterior.tipo === 'fundo' || anterior.tipo === 'fim');
    const comprimento = x + (fechado ? 0 : 60);

    const paradas = [];
    let portaAtual = null;
    for (const item of itens) {
        if ((item.tipo === 'porta' || item.tipo === 'fundo') && temNome(item)) portaAtual = item;
        // o fim do corredor e o estoque não têm armário: não vale parar neles
        const ehParada = item.tipo === 'bloco' || (item.tipo === 'porta' && item.variante !== 'estoque');
        if (!ehParada) continue;
        paradas.push({
            centro: item.x + item.largura / 2,
            largura: item.largura,
            topo: item.tipo === 'bloco' ? 90 : 16,
            base: 308,
            tipo: item.tipo,
            rotulo: item.tipo === 'bloco' ? '' : rotuloCurto(item),
            local: descreverLocal(portaAtual)
        });
    }

    const numeros = itens.filter((i) => (i.tipo === 'porta' || i.tipo === 'fundo') && i.numero).map((i) => i.numero);
    let salas = numeros.length > 1
        ? `Salas ${numeros[0]} a ${numeros[numeros.length - 1]}`
        : numeros.length === 1 ? `Sala ${numeros[0]}` : '';
    if (itens.some((i) => i.variante === 'laboratorio')) salas = salas ? `${salas} e laboratório` : 'Laboratório';

    return {
        itens,
        comprimento,
        paradas,
        salas,
        livres: doCorredor.filter((a) => a.estado === 'livre').length
    };
}

// Computador e totem: uma escala só para o corredor todo.
// Celular: cada parada ocupa a largura da tela, acima da faixa das setas.
export function enquadrar(lay, largura, altura, celular) {
    if (celular) {
        const areaAltura = altura - FAIXA_CONTROLES;
        return lay.paradas.map((p) => {
            const alturaParada = p.base - p.topo;
            const escala = Math.min((largura - 20) / p.largura, areaAltura / alturaParada, 6);
            return {
                escala,
                tx: largura / 2 - (p.centro + MARGEM) * escala,
                ty: (areaAltura - alturaParada * escala) / 2 - p.topo * escala + 4
            };
        });
    }

    const maior = Math.max(...lay.paradas.map((p) => p.largura));
    const escala = Math.max(0.5, Math.min(altura / JANELA_ALTURA, largura / (maior + 4), 6));
    const ty = (altura - JANELA_ALTURA * escala) / 2 - JANELA_TOPO * escala;
    return lay.paradas.map((p) => ({ escala, tx: largura / 2 - (p.centro + MARGEM) * escala, ty }));
}
```

- [ ] **Step 5: Implementar a paleta**

`front/src/screens/Home/mapa/estiloMapa.js`:

```js
// Cores do mapa. O admin escolhe um modo; no personalizado, só as cores da
// lista CORES_EDITAVEIS mudam, o resto (cano, batente, piso) vem do escuro.

const BASE = {
    escuro: {
        fundo: '#091528', parede: '#16243D', faixa: '#101B2E', faixaLinha: '#0A1220',
        vidro: '#1D3050', caixilho: '#2C4166', cano: '#B14238', porta: '#4A2C1E', batente: '#2E1B0E',
        piso: '#0F1B2E', pisoJunta: '#1B2940', armario_claro: '#5A6880', armario_escuro: '#3A4759',
        portal: '#B14238', marcaPlaca: '#E2572B', selecao: '#E8B44A',
        carta: '#0C1B36', borda: 'rgba(255, 255, 255, .09)', texto: '#F2F5FA', textoSuave: 'rgba(242, 245, 250, .62)'
    },
    claro: {
        fundo: '#D8DCDE', parede: '#F3F2EE', faixa: '#8D9BA2', faixaLinha: '#7A888F',
        vidro: '#CFDADF', caixilho: '#9AA3A6', cano: '#C7372E', porta: '#6A3A22', batente: '#55301C',
        piso: '#E4E5E1', pisoJunta: '#CFD1CC', armario_claro: '#B7BCC0', armario_escuro: '#6D757B',
        portal: '#C7372E', marcaPlaca: '#E2572B', selecao: '#C8912E',
        carta: '#FFFFFF', borda: 'rgba(10, 31, 68, .12)', texto: '#0A1F44', textoSuave: 'rgba(10, 31, 68, .62)'
    }
};

export const CORES_EDITAVEIS = [
    { campo: 'fundo', titulo: 'Fundo da cena' },
    { campo: 'parede', titulo: 'Parede' },
    { campo: 'faixa', titulo: 'Faixa baixa da parede' },
    { campo: 'vidro', titulo: 'Vidro das salas' },
    { campo: 'porta', titulo: 'Portas' },
    { campo: 'armario_claro', titulo: 'Armário claro' },
    { campo: 'armario_escuro', titulo: 'Armário escuro' },
    { campo: 'selecao', titulo: 'Armário selecionado' }
];

export function paletaDoMapa(estilo) {
    const paleta = { ...BASE[estilo?.modo === 'claro' ? 'claro' : 'escuro'] };
    if (estilo?.modo === 'personalizado') {
        for (const { campo } of CORES_EDITAVEIS) {
            if (estilo[campo]) paleta[campo] = estilo[campo];
        }
    }
    return paleta;
}

export function variaveisCss(paleta) {
    return {
        '--mapa-fundo': paleta.fundo,
        '--mapa-carta': paleta.carta,
        '--mapa-borda': paleta.borda,
        '--mapa-texto': paleta.texto,
        '--mapa-texto-suave': paleta.textoSuave,
        '--mapa-selecao': paleta.selecao
    };
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd front && npm test`
Expected: PASS, 12 testes.

- [ ] **Step 7: Commit**

```bash
git add front/package.json front/src/screens/Home/mapa
git commit -m "feat(mapa): geometria da parede e paleta do mapa"
```

---

### Task 6: Desenho SVG da parede

**Files:**
- Create: `front/src/screens/Home/mapa/desenhoParede.js`
- Create: `front/src/screens/Home/mapa/desenhoParede.test.js`

**Interfaces:**
- Consumes: `Layout` e `ItemPosicionado` (Task 5), `Paleta` (Task 5), `ALTURA`, `MARGEM`.
- Produces: `desenharParede(corredor: { nome }, lay: Layout, paleta: Paleta): string` — um `<svg>` com `viewBox="-600 0 <comprimento + 1200> 340"`. Cada armário é um `<g class="armario" data-id="<id>" data-estado="<estado>">`; os livres têm `role="button" tabindex="0"`. O contorno de seleção é o `rect.anel`, estilizado por CSS (Task 8).

- [ ] **Step 1: Escrever os testes que falham**

`front/src/screens/Home/mapa/desenhoParede.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desenharParede } from './desenhoParede.js';
import { montarCorredor } from './geometria.js';
import { paletaDoMapa } from './estiloMapa.js';

const corredor = {
    id: 'c2',
    nome: 'Corredor <2>',
    itens: [
        { id: 'p0', tipo: 'portal' },
        { id: 'p12', tipo: 'porta', numero: '12' },
        { id: 'est', tipo: 'porta', variante: 'estoque' },
        { id: 'lab', tipo: 'porta', variante: 'laboratorio', rotulo: 'Ciências' },
        { id: 'b1', tipo: 'bloco', tom: 'escuro', larguras: [30, 30] },
        { id: 'sn', tipo: 'fundo', variante: 'vidro', rotulo: 'Salão Nobre' }
    ]
};

const armarios = [
    { id: 'a1', nome: '347', item_id: 'b1', coluna: 0, linha: 0, estado: 'livre', meu: false },
    { id: 'a2', nome: '348', item_id: 'b1', coluna: 1, linha: 0, estado: 'ocupado', meu: false },
    // linha 1 da coluna 1 fica sem armário de propósito
    { id: 'a3', nome: '351', item_id: 'b1', coluna: 1, linha: 2, estado: 'manutencao', meu: false }
];

const desenhar = () => {
    const lay = montarCorredor(corredor, armarios);
    return { lay, svg: desenharParede(corredor, lay, paletaDoMapa(null)) };
};

test('desenha um svg do tamanho do corredor com margem dos dois lados', () => {
    const { lay, svg } = desenhar();
    assert.match(svg, new RegExp(`^<svg viewBox="-600 0 ${lay.comprimento + 1200} 340"`));
    assert.match(svg, /<\/svg>$/);
});

test('um grupo por armário, com id e estado', () => {
    const { svg } = desenhar();
    assert.equal((svg.match(/class="armario"/g) || []).length, 3);
    assert.match(svg, /data-id="a1" data-estado="livre" role="button" tabindex="0"/);
    assert.match(svg, /data-id="a2" data-estado="ocupado" role="img"/);
    assert.match(svg, /data-id="a3" data-estado="manutencao" role="img"/);
    assert.match(svg, />347<\/text>/);
});

test('célula sem armário vira porta vazia, sem grupo clicável', () => {
    const { svg } = desenhar();
    assert.equal((svg.match(/class="porta-vazia"/g) || []).length, 1);
});

test('estoque não tem placa; sala e laboratório têm', () => {
    const { svg } = desenhar();
    assert.equal((svg.match(/SALA DE AULA/g) || []).length, 1);
    assert.equal((svg.match(/LABORATÓRIO/g) || []).length, 1);
    assert.match(svg, />SALÃO NOBRE<\/text>/);
});

test('escapa texto vindo do banco', () => {
    const { svg } = desenhar();
    assert.match(svg, /CORREDOR &lt;2>/);
    assert.doesNotMatch(svg, /<2>/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd front && npm test`
Expected: FAIL com `Cannot find module ... desenhoParede.js`

- [ ] **Step 3: Implementar**

`front/src/screens/Home/mapa/desenhoParede.js` — portado de `desenharParede`, `desenharItem`, `desenharBloco`, `desenharPorta`, `desenharFundo` e `placa` do protótipo, com as trocas: paleta com os nomes de `estiloMapa.js`, armário real em vez de número, célula vazia, e estado vindo do banco.

```js
// A parede do corredor em SVG, como texto. Todo texto que vem do banco passa
// por `texto()` antes de entrar no desenho.
import { ALTURA, MARGEM } from './geometria.js';

const COR_ESTADO = { livre: '#3D7BEA', ocupado: '#DC4438', manutencao: 'url(#listras)' };
const NOME_ESTADO = { livre: 'livre', ocupado: 'ocupado', manutencao: 'em manutenção' };

const f = (n) => Math.round(n * 100) / 100;
const texto = (valor) => String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ret = (x, y, w, h, extra = '') =>
    `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" ${extra}/>`;

function placa(x, y, largura, linha1, linha2, tamanho2, P) {
    const meio = x + largura / 2;
    let s = ret(x, y + 1, largura, 50, 'rx="3" fill="#000000" fill-opacity=".35"')
        + ret(x, y, largura, 50, 'rx="3" fill="#F4F6F8"')
        + ret(x + 6, y + 6, 8, 8, `rx="1" fill="${P.marcaPlaca}"`)
        + `<text class="mapa-t-placa" x="${f(meio + 5)}" y="${f(y + 13.5)}" font-size="6.2" text-anchor="middle">${texto(linha1)}</text>`;
    if (linha2) {
        s += `<text class="mapa-t-placa" x="${f(meio)}" y="${f(y + 42)}" font-size="${tamanho2}" text-anchor="middle">${texto(linha2)}</text>`;
    }
    return s;
}

function desenharBloco(item, P) {
    const topo = 100;
    const corpoAltura = 192;
    const w = item.largura;
    const corpo = item.tom === 'claro' ? P.armario_claro : P.armario_escuro;
    let s = '';

    // reflexo no piso, cortado por um véu da cor do chão
    s += ret(item.x + 3, 300, w - 6, 34, `fill="${corpo}" fill-opacity=".22"`);
    s += ret(item.x + 3, 300, w - 6, 34, 'fill="url(#pisoVeu)"');

    s += ret(item.x, topo, w, corpoAltura, `rx="3" fill="${corpo}"`);
    s += ret(item.x, topo, w, corpoAltura, 'rx="3" fill="url(#corpoBrilho)"');
    s += ret(item.x + 2, topo, w - 4, 3, 'rx="1.5" fill="#FFFFFF" fill-opacity=".14"');
    s += ret(item.x + 5, topo + corpoAltura, 7, 8, 'rx="1" fill="#05090F" fill-opacity=".8"');
    s += ret(item.x + w - 12, topo + corpoAltura, 7, 8, 'rx="1" fill="#05090F" fill-opacity=".8"');

    const areaTopo = topo + 9;
    const areaAltura = corpoAltura - 13;
    let cx = item.x + 4;

    item.colunas.forEach((celulas, c) => {
        const cw = item.larguras[c];
        s += ret(cx + cw * 0.22, topo + 5.5, cw * 0.56, 2.4, 'rx="1.2" fill="#000000" fill-opacity=".38"');
        const celula = celulas.length ? areaAltura / celulas.length : areaAltura;

        celulas.forEach((armario, linha) => {
            const y = areaTopo + linha * celula;

            if (!armario) {
                s += ret(cx + 1.5, y + 1.5, cw - 3, celula - 3, 'class="porta-vazia" rx="2" fill="#000000" fill-opacity=".22"');
                return;
            }

            const estado = armario.estado;
            const larguraEtiqueta = Math.min(cw - 7, 24);
            const papel = estado === 'livre' ? 'role="button" tabindex="0"' : 'role="img"';

            s += `<g class="armario" data-id="${texto(armario.id)}" data-estado="${estado}" ${papel} aria-label="Armário ${texto(armario.nome)}, ${NOME_ESTADO[estado]}">`;
            s += ret(cx + 1.5, y + 1.5, cw - 3, celula - 3, `class="porta-armario" rx="2" fill="${COR_ESTADO[estado]}"`);
            s += ret(cx + 1.5, y + 1.5, cw - 3, celula - 3, 'rx="2" fill="url(#portaBrilho)" pointer-events="none"');

            if (celula >= 32) {
                for (let i = 0; i < 4; i++) {
                    s += ret(cx + cw * 0.44, y + celula * 0.36 + i * 4.6, cw * 0.38, 1.8, 'rx=".9" fill="#04080F" fill-opacity=".26"');
                }
            }

            s += ret(cx + 4, y + 5.6, larguraEtiqueta, 12, 'rx="1.5" fill="#000000" fill-opacity=".3"');
            s += ret(cx + 4, y + 5, larguraEtiqueta, 12, 'rx="1.5" fill="#F7F9FB"');
            s += `<text class="mapa-t-num" x="${f(cx + 4 + larguraEtiqueta / 2)}" y="${f(y + 14.3)}" font-size="8.6" text-anchor="middle">${texto(armario.nome)}</text>`;

            if (estado === 'ocupado') {
                s += `<path d="M${f(cx + cw - 6)} ${f(y + celula * 0.46)} v-2.4 a2.1 2.1 0 0 0-4.2 0 v2.4" fill="none" stroke="#E7E9EC" stroke-opacity=".75" stroke-width="1.1"/>`;
                s += ret(cx + cw - 9.2, y + celula * 0.46, 6.5, 6.5, 'rx="1.4" fill="#E0BC63"');
            } else {
                s += ret(cx + cw - 7, y + celula * 0.42, 2.6, 8, 'rx="1.3" fill="#04080F" fill-opacity=".34"');
            }

            s += ret(cx + 0.3, y + 0.3, cw - 0.6, celula - 0.6, 'class="anel" rx="2.5" pointer-events="none"');
            s += '</g>';
        });

        cx += cw;
    });

    return s;
}

function desenharPorta(item, P) {
    const x = item.x;
    let s = '';

    s += ret(x + 6, 300, 98, 30, `fill="${P.porta}" fill-opacity=".3"`);
    s += ret(x + 6, 300, 98, 30, 'fill="url(#pisoVeu)"');
    s += ret(x, 84, 110, 216, `rx="2" fill="${P.batente}"`);
    s += ret(x + 9, 92, 92, 208, `rx="1.5" fill="${P.porta}"`);
    s += ret(x + 9, 92, 92, 208, 'rx="1.5" fill="url(#portaMadeira)"');
    s += ret(x + 20, 112, 70, 78, 'rx="3" fill="#000000" fill-opacity=".14"');
    s += ret(x + 20, 204, 70, 78, 'rx="3" fill="#000000" fill-opacity=".14"');
    s += ret(x + 86, 196, 5, 26, 'rx="2.5" fill="#C9CCCD"');

    // estoque não tem placa na escola, então aqui também não
    if (item.variante === 'laboratorio') {
        s += placa(x + 11, 24, 88, 'LABORATÓRIO', item.rotulo.toUpperCase(), item.rotulo.length > 10 ? 9 : 12, P);
    } else if (item.variante !== 'estoque' && item.numero) {
        s += placa(x + 22, 24, 66, 'SALA DE AULA', item.numero, 24, P);
    }
    return s;
}

function desenharFundo(item, P) {
    const x = item.x;
    let s = ret(x, 0, 150, 340, `fill="${P.parede}"`)
        + ret(x, 0, 150, 340, 'fill="#000000" fill-opacity=".22"')
        + ret(x, 200, 150, 100, `fill="${P.faixa}"`)
        + ret(x, 200, 150, 100, 'fill="#000000" fill-opacity=".2"')
        + ret(x, 0, 4, 340, 'fill="#000000" fill-opacity=".4"');

    if (item.variante === 'vidro') {
        s += ret(x + 18, 92, 114, 208, 'rx="2" fill="#2A3444"')
            + ret(x + 24, 98, 49, 202, 'fill="#8DB4E6" fill-opacity=".2"')
            + ret(x + 77, 98, 49, 202, 'fill="#8DB4E6" fill-opacity=".2"')
            + `<path d="M${x + 30} 104 L${x + 50} 104 L${x + 30} 150 Z" fill="#FFFFFF" fill-opacity=".12"/>`
            + `<path d="M${x + 83} 104 L${x + 103} 104 L${x + 83} 150 Z" fill="#FFFFFF" fill-opacity=".12"/>`
            + ret(x + 65, 180, 3, 44, 'rx="1.5" fill="#C9CCCD"')
            + ret(x + 82, 180, 3, 44, 'rx="1.5" fill="#C9CCCD"')
            + ret(x + 20, 40, 110, 42, 'rx="3" fill="#000000" fill-opacity=".35"')
            + ret(x + 20, 39, 110, 42, 'rx="3" fill="#F4F6F8"')
            + `<text class="mapa-t-placa" x="${x + 75}" y="66" font-size="13" text-anchor="middle">${texto(item.rotulo.toUpperCase())}</text>`;
        return s;
    }

    s += ret(x + 30, 96, 90, 204, `rx="2" fill="${P.batente}"`)
        + ret(x + 38, 103, 74, 197, `rx="1.5" fill="${P.porta}"`)
        + ret(x + 38, 103, 74, 197, 'rx="1.5" fill="url(#portaMadeira)"')
        + ret(x + 100, 200, 4, 22, 'rx="2" fill="#C9CCCD"');

    if (item.numero) s += placa(x + 42, 36, 66, 'SALA DE AULA', item.numero, 24, P);
    return s;
}

function desenharItem(item, P, corredor, lay) {
    const x = item.x;

    switch (item.tipo) {
        case 'bloco': return desenharBloco(item, P);
        case 'porta': return desenharPorta(item, P);
        case 'fundo': return desenharFundo(item, P);

        case 'portal': {
            const linha2 = lay.salas ? `(${lay.salas.toUpperCase()})` : '';
            return ret(x, 0, 36, 300, `fill="${P.portal}"`)
                + ret(x, 0, 36, 300, 'fill="url(#corpoBrilho)"')
                + ret(x + 36, 0, 5, 300, 'fill="#000000" fill-opacity=".3"')
                + ret(x + 50, 111, 128, 44, 'rx="3" fill="#000000" fill-opacity=".35"')
                + ret(x + 50, 110, 128, 44, 'rx="3" fill="#F4F6F8"')
                + `<text class="mapa-t-placa" x="${x + 114}" y="129" font-size="12.5" text-anchor="middle">${texto(corredor.nome.toUpperCase())}</text>`
                + `<text class="mapa-t-placa" x="${x + 114}" y="145" font-size="6.4" text-anchor="middle">${texto(linha2)}</text>`;
        }

        case 'fim':
            return ret(x, 0, 90, 340, `fill="${P.parede}"`)
                + ret(x, 0, 90, 340, 'fill="#000000" fill-opacity=".22"')
                + ret(x, 200, 90, 100, `fill="${P.faixa}"`)
                + ret(x, 0, 4, 340, 'fill="#000000" fill-opacity=".4"');

        case 'hidrante':
            return ret(x + 31, 11, 8, 132, 'fill="#A83A31"')
                + ret(x - 14, 196, 12, 16, 'rx="2" fill="#C4552F"')
                + ret(x, 140, 70, 112, 'rx="4" fill="#C0362B"')
                + ret(x, 140, 70, 112, 'rx="4" fill="url(#corpoBrilho)"')
                + `<circle cx="${x + 35}" cy="176" r="13" fill="#12161C" stroke="#DFE3E8" stroke-opacity=".7" stroke-width="3"/>`
                + ret(x + 22, 228, 26, 3, 'rx="1.5" fill="#000000" fill-opacity=".3"')
                + ret(x + 22, 235, 26, 3, 'rx="1.5" fill="#000000" fill-opacity=".3"')
                + ret(x + 56, 252, 8, 48, 'fill="#A83A31"');

        case 'extintor':
            return ret(x + 2, 250, 22, 3, 'rx="1.5" fill="#4A4F57"')
                + ret(x + 9, 236, 8, 10, 'rx="2" fill="#2B3038"')
                + ret(x + 4, 244, 18, 54, 'rx="8" fill="#C0362B"')
                + ret(x + 4, 244, 18, 54, 'rx="8" fill="url(#corpoBrilho)"')
                + ret(x + 7, 264, 12, 14, 'rx="2" fill="#F4F6F8" fill-opacity=".8"');

        case 'lixeira':
            return `<path d="M${x + 3} 262 L${x + 39} 262 L${x + 36} 300 L${x + 6} 300 Z" fill="#9AA3AF" fill-opacity=".55"/>`
                + ret(x, 255, 42, 9, 'rx="4" fill="#B6BEC9" fill-opacity=".6"');

        case 'mural':
            return ret(x, 112, 110, 78, 'rx="3" fill="#1D5B41" stroke="#8E97A3" stroke-opacity=".5" stroke-width="4"')
                + ret(x + 62, 122, 30, 38, `rx="1" fill="#E8E4D6" fill-opacity=".85" transform="rotate(-8 ${x + 77} 141)"`);

        case 'quadro':
            return ret(x, 118, 40, 62, 'rx="3" fill="#39414D" stroke="#7E8794" stroke-opacity=".4" stroke-width="1.5"')
                + ret(x + 6, 128, 28, 8, 'rx="2" fill="#20262F"');

        case 'rampa': {
            let s = '';
            for (const d of [0, 24]) {
                s += `<path d="M${x} ${226 + d} L${x + 210} ${250 + d}" stroke="#3C63B0" stroke-width="4" fill="none" stroke-linecap="round"/>`;
            }
            for (const dx of [10, 105, 200]) {
                const y = 226 + (dx * 24) / 210;
                s += ret(x + dx, y, 4, 300 - y, 'rx="2" fill="#3C63B0"');
            }
            return s;
        }

        default:
            return '';
    }
}

export function desenharParede(corredor, lay, paleta) {
    const P = paleta;
    const inicio = -MARGEM;
    const fim = lay.comprimento;
    const W = fim - inicio;

    let s = `<svg viewBox="${inicio} 0 ${lay.comprimento + MARGEM * 2} ${ALTURA}" role="group" aria-label="Parede do ${texto(corredor.nome)}">`;

    s += '<defs>'
        + '<linearGradient id="corpoBrilho" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".13"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".2"/></linearGradient>'
        + '<linearGradient id="portaBrilho" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".17"/><stop offset=".55" stop-color="#FFFFFF" stop-opacity=".02"/><stop offset="1" stop-color="#000000" stop-opacity=".16"/></linearGradient>'
        + '<linearGradient id="portaMadeira" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".12"/><stop offset=".3" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".22"/></linearGradient>'
        + '<linearGradient id="paredeLuz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".09"/><stop offset=".6" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
        + `<linearGradient id="pisoVeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.piso}" stop-opacity=".5"/><stop offset="1" stop-color="${P.piso}" stop-opacity="1"/></linearGradient>`
        + '<linearGradient id="vidroLuz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".02"/></linearGradient>'
        + '<radialGradient id="luz"><stop offset="0" stop-color="#DCE8FF" stop-opacity=".22"/><stop offset="1" stop-color="#DCE8FF" stop-opacity="0"/></radialGradient>'
        + '<pattern id="listras" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#F0BE2C"/><rect width="3.6" height="9" fill="#181818" fill-opacity=".58"/></pattern>'
        + '</defs>';

    s += ret(inicio, 0, W, 300, `fill="${P.parede}"`);
    s += ret(inicio, 0, W, 300, 'fill="url(#paredeLuz)"');
    s += ret(inicio, 0, W, 7, `fill="${P.faixaLinha}"`);
    s += ret(inicio, 7, W, 4, `fill="${P.cano}"`);

    s += ret(inicio, 16, W, 68, `fill="${P.vidro}"`);
    s += ret(inicio, 16, W, 68, 'fill="url(#vidroLuz)"');
    for (let m = inicio; m < fim; m += 240) {
        s += `<path d="M${m + 30} 19 L${m + 62} 19 L${m + 22} 81 L${m - 10} 81 Z" fill="#FFFFFF" fill-opacity=".07"/>`;
    }
    for (let m = inicio; m < fim; m += 80) s += ret(m, 16, 3, 68, `fill="${P.caixilho}"`);
    s += ret(inicio, 16, W, 3, `fill="${P.caixilho}"`);
    s += ret(inicio, 81, W, 3, `fill="${P.caixilho}"`);

    s += ret(inicio, 200, W, 100, `fill="${P.faixa}"`);
    s += ret(inicio, 200, W, 2, 'fill="#FFFFFF" fill-opacity=".08"');

    s += ret(inicio, 300, W, 40, `fill="${P.piso}"`);
    for (let m = inicio; m < fim; m += 60) s += ret(m, 300, 1.2, 40, `fill="${P.pisoJunta}"`);
    s += ret(inicio, 319, W, 1.2, `fill="${P.pisoJunta}"`);
    s += ret(inicio, 297, W, 3, 'fill="#000000" fill-opacity=".25"');

    // lâmpadas do forro e as poças de luz que elas jogam na parede e no chão
    for (let m = inicio + 120; m < fim; m += 380) {
        s += `<ellipse cx="${m + 60}" cy="40" rx="210" ry="120" fill="url(#luz)"/>`;
        s += `<ellipse cx="${m + 60}" cy="316" rx="150" ry="18" fill="url(#luz)"/>`;
        s += ret(m, 1, 120, 5, 'rx="2.5" fill="#E6EEFF" fill-opacity=".8"');
    }

    for (const item of lay.itens) s += desenharItem(item, P, corredor, lay);

    return `${s}</svg>`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd front && npm test`
Expected: PASS, 17 testes.

- [ ] **Step 5: Commit**

```bash
git add front/src/screens/Home/mapa/desenhoParede.js front/src/screens/Home/mapa/desenhoParede.test.js
git commit -m "feat(mapa): desenho da parede do corredor em SVG"
```

---

### Task 7: Carregamento do mapa e detecção de celular

**Files:**
- Modify: `front/src/services/armariosServices.js` (novo método `buscarMapa`)
- Create: `front/src/utils/useCelular.js`
- Create: `front/src/utils/useMapaEscola.js`
- Create: `front/src/screens/Home/GradeArmarios.jsx` (conteúdo atual de `Home/index.jsx`)
- Modify: `front/src/screens/Home/index.jsx`

**Interfaces:**
- Consumes: endpoint da Task 4.
- Produces:
  - `armariosService.buscarMapa(schoolCode): Promise<Mapa>`
  - `useCelular(): boolean`
  - `useMapaEscola(schoolCode): { mapa: Mapa | null, carregando: boolean, erro: string | null }`
  - `GradeArmarios` — componente default, a tela de hoje sem mudança.

Esta task não muda o que o aluno vê: `Home/index.jsx` continua mostrando a grade. A troca acontece na Task 10.

- [ ] **Step 1: Medir o lint antes de mexer**

Run: `cd front && npx eslint . 2>&1 | tail -3`
Anotar a linha `✖ N problems (E errors, W warnings)`. Esse é o número de referência para a Task 12.

- [ ] **Step 2: Método no serviço**

Em `front/src/services/armariosServices.js`, logo depois de `buscarTodos`:

```js
  // Planta, parede e armários posicionados. Escola sem mapa responde { corredores: [] }.
  buscarMapa: async (schoolCode) => {
    const response = await fetch(`${API_URL}/escola/${schoolCode}/mapa`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Erro ao buscar o mapa da instituição');
    return await response.json();
  },
```

- [ ] **Step 3: Hook de celular**

`front/src/utils/useCelular.js`:

```js
import { useSyncExternalStore } from 'react';

// Celular = tela estreita, ou tela de toque até o tamanho de um tablet.
// Totem e computador ficam de fora e usam a cena com escala única.
const CONSULTA = '(max-width: 640px), (pointer: coarse) and (max-width: 1024px)';

function assinar(avisar) {
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener('change', avisar);
  return () => consulta.removeEventListener('change', avisar);
}

export function useCelular() {
  return useSyncExternalStore(assinar, () => window.matchMedia(CONSULTA).matches, () => false);
}
```

- [ ] **Step 4: Hook do mapa**

`front/src/utils/useMapaEscola.js`:

```js
import { useEffect, useState } from 'react';
import { armariosService } from '../services/armariosServices';

// Falha ao buscar o mapa não é erro para o aluno: a tela cai na grade de
// armários, que tem o próprio carregamento e a própria mensagem de erro.
export function useMapaEscola(schoolCode) {
  const [estado, setEstado] = useState({ mapa: null, carregando: true, erro: null });

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      if (!schoolCode) {
        setEstado({ mapa: null, carregando: false, erro: 'Código da instituição não identificado na URL.' });
        return;
      }
      try {
        const mapa = await armariosService.buscarMapa(schoolCode);
        if (!cancelado) setEstado({ mapa, carregando: false, erro: null });
      } catch {
        if (!cancelado) setEstado({ mapa: null, carregando: false, erro: 'Não foi possível carregar o mapa.' });
      }
    };

    carregar();
    return () => { cancelado = true; };
  }, [schoolCode]);

  return estado;
}
```

- [ ] **Step 5: Mover a grade atual**

Run:
```bash
cd front/src/screens/Home && git mv index.jsx GradeArmarios.jsx
```

Em `GradeArmarios.jsx`, trocar só a assinatura:

```jsx
export default function GradeArmarios() {
```

- [ ] **Step 6: Novo `Home/index.jsx` (ainda só com a grade)**

`front/src/screens/Home/index.jsx`:

```jsx
import GradeArmarios from './GradeArmarios.jsx';

export default function Home() {
  return <GradeArmarios />;
}
```

- [ ] **Step 7: Build**

Run: `cd front && npm run build`
Expected: build sem erro.

- [ ] **Step 8: Commit**

```bash
git add front/src/services/armariosServices.js front/src/utils/useCelular.js front/src/utils/useMapaEscola.js front/src/screens/Home
git commit -m "refactor(armarios): grade de armários em arquivo próprio e carregamento do mapa"
```

---

### Task 8: Planta e estilos do mapa

**Files:**
- Create: `front/src/screens/Home/Mapa.css`
- Create: `front/src/screens/Home/Planta.jsx`

**Interfaces:**
- Consumes: `Layout` (Task 5), `mapa.planta` e `mapa.corredores` (Task 4).
- Produces: `<Planta planta={object} corredores={Corredor[]} montados={Map<id, Layout>} aoEscolher={(id) => void} />`. As classes de `Mapa.css` usadas pelas Tasks 9 e 10.

- [ ] **Step 1: Estilos**

`front/src/screens/Home/Mapa.css`:

```css
/* Mapa de corredores. As cores vêm de variaveisCss(paletaDoMapa(estilo)),
   aplicadas no .mapa; as de status são fixas porque precisam significar a
   mesma coisa em qualquer escola. */

.mapa {
  --mapa-saida: cubic-bezier(.23, 1, .32, 1);
  --mapa-livre: #3D7BEA;
  --mapa-ocupado: #DC4438;
  --mapa-manutencao: #F0BE2C;
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* 64px da NavBar + 48px do padding do <main> */
  height: calc(100dvh - 112px);
  min-height: 460px;
  color: var(--mapa-texto);
}

.mapa button { font: inherit; color: inherit; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.mapa button:focus-visible, .mapa .armario:focus-visible { outline: 2px solid var(--mapa-selecao); outline-offset: 3px; }

.mapa-cabecalho { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 10px 20px; }
.mapa-titulo { margin: 0; font-size: clamp(22px, 2.3vw, 30px); font-weight: 800; line-height: 1.1; color: var(--mapa-texto); }
.mapa-dica { margin: 4px 0 0; color: var(--mapa-texto-suave); }

.mapa-pino {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px;
  border: 1px solid var(--mapa-borda); background: var(--mapa-carta); color: var(--mapa-texto-suave); white-space: nowrap;
}
.mapa-pino b { color: var(--mapa-texto); font-variant-numeric: tabular-nums; }

/* ---------- planta ---------- */

.mapa-planta {
  flex: 1; min-height: 0; display: grid; gap: 14px;
  grid-template-columns: var(--colunas-p); grid-template-rows: var(--linhas-p);
}
.mapa-planta > * { grid-area: var(--area-p); min-width: 0; min-height: 0; }

.mapa-patio {
  display: grid; place-items: center; padding-left: var(--recuo-p, 0px); background-origin: content-box;
  border-radius: 30px; border: 1px solid var(--mapa-borda);
  background:
    radial-gradient(closest-side, color-mix(in srgb, var(--mapa-selecao) 8%, transparent), transparent 80%),
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--mapa-texto) 3%, transparent) 0 1px, transparent 1px 36px),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--mapa-texto) 3%, transparent) 0 1px, transparent 1px 36px);
}
.mapa-patio span { font-size: 13px; font-weight: 700; letter-spacing: .34em; text-indent: .34em; text-transform: uppercase; color: var(--mapa-texto-suave); opacity: .7; }

.mapa-cartao {
  container-type: inline-size; position: relative; z-index: 1; display: flex; padding: 0; border-radius: 24px; cursor: pointer; text-align: left;
  border: 1px solid color-mix(in srgb, var(--cor) 34%, transparent);
  background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--cor) 16%, transparent), transparent 60%), var(--mapa-carta);
  transition: border-color 160ms ease, transform 160ms var(--mapa-saida);
}
.mapa-cartao:active { transform: scale(.98); }

@media (hover: hover) and (pointer: fine) {
  .mapa-cartao:hover { border-color: color-mix(in srgb, var(--cor) 75%, transparent); }
}

.mapa-cartao__corpo { flex: 1; display: flex; align-items: center; gap: 16px; padding: 16px 20px; min-width: 0; }
.mapa-cartao__sigla {
  flex: none; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%;
  background: var(--cor); color: #0A1524; font-size: 24px; font-weight: 800;
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--cor) 16%, transparent);
}
.mapa-cartao__sigla--longa { font-size: 17px; }
.mapa-cartao__texto { flex: 1; min-width: 0; display: grid; gap: 3px; }
.mapa-cartao__nome { font-size: 20px; font-weight: 800; line-height: 1.15; }
.mapa-cartao__nome-curto { display: none; }
.mapa-cartao__salas { font-size: 13px; color: var(--mapa-texto-suave); }
.mapa-cartao__livres { flex: none; display: grid; justify-items: end; gap: 2px; }
.mapa-cartao__livres b { font-size: 30px; line-height: 1; font-variant-numeric: tabular-nums; }
.mapa-cartao__livres span { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--mapa-texto-suave); }

@container (max-width: 230px) {
  .mapa-cartao__corpo { flex-direction: column; justify-content: center; text-align: center; gap: 10px; padding: 16px 10px; }
  .mapa-cartao__texto { flex: none; justify-items: center; }
  .mapa-cartao__nome { font-size: clamp(15px, 9cqi, 20px); }
  .mapa-cartao__nome-longo { display: none; }
  .mapa-cartao__nome-curto { display: inline; }
  .mapa-cartao__livres { justify-items: center; }
  .mapa-cartao__livres b { font-size: clamp(26px, 18cqi, 42px); }
  .mapa-cartao__sigla { width: clamp(50px, 34cqi, 84px); height: clamp(50px, 34cqi, 84px); font-size: clamp(22px, 15cqi, 36px); }
}

@container (max-width: 140px) {
  .mapa-cartao__salas { display: none; }
}

/* ---------- corredor ---------- */

.mapa-barra { display: flex; align-items: center; gap: 12px; }
.mapa-voltar {
  flex: none; display: inline-flex; align-items: center; gap: 7px; min-height: 46px; padding: 0 16px 0 12px; border-radius: 14px;
  border: 1px solid var(--mapa-borda); background: var(--mapa-carta); font-weight: 600; cursor: pointer;
}
.mapa-voltar:active { transform: scale(.96); }
.mapa-barra__titulo { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; }
.mapa-barra__sigla { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--cor); color: #0A1524; font-weight: 800; }
.mapa-barra__nome { margin: 0; font-size: clamp(19px, 2vw, 25px); font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mapa-barra__salas { margin: 1px 0 0; font-size: 13px; color: var(--mapa-texto-suave); }

.mapa-cena {
  position: relative; flex: 1; min-height: 0; overflow: hidden; border-radius: 22px;
  border: 1px solid var(--mapa-borda); background: var(--mapa-fundo);
  touch-action: pan-y; user-select: none; -webkit-user-select: none;
}
.mapa-trilho { position: absolute; left: 0; top: 0; transform-origin: 0 0; transition: transform 280ms var(--mapa-saida); }
.mapa-trilho svg { display: block; }
.mapa-vinheta { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(4, 9, 20, .45), transparent 12%, transparent 88%, rgba(4, 9, 20, .45)); }
.mapa-foco { position: absolute; inset: 0 auto 0 0; width: 100%; display: none; background: rgba(5, 11, 24, .74); transition: transform 280ms var(--mapa-saida); }

.mapa-local {
  position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); padding: 8px 15px; border-radius: 999px;
  background: rgba(7, 14, 29, .75); border: 1px solid rgba(255, 255, 255, .1); color: #F2F5FA;
  font-size: 13px; font-weight: 500; white-space: nowrap; pointer-events: none;
}

.mapa-seta {
  position: absolute; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 64px; height: 64px;
  border-radius: 50%; border: 1px solid rgba(255, 255, 255, .16); background: rgba(7, 16, 33, .8); color: #F2F5FA; cursor: pointer;
  transition: opacity 160ms ease, transform 160ms var(--mapa-saida);
}
.mapa-seta--esq { left: 14px; }
.mapa-seta--dir { right: 14px; }
.mapa-seta:active:not(:disabled) { transform: translateY(-50%) scale(.92); }
.mapa-seta:disabled { opacity: .2; cursor: default; }
.mapa-seta svg { width: 30px; height: 30px; }

/* no celular as setas descem para uma faixa própria e não cobrem armário */
.mapa-cena--celular .mapa-vinheta { display: none; }
.mapa-cena--celular .mapa-foco { display: block; }
.mapa-cena--celular .mapa-seta { top: auto; bottom: 12px; width: 58px; height: 58px; transform: none; }
.mapa-cena--celular .mapa-seta:active:not(:disabled) { transform: scale(.92); }
.mapa-cena--celular .mapa-seta--esq { left: 12px; }
.mapa-cena--celular .mapa-seta--dir { right: 12px; }
.mapa-cena--celular .mapa-local { bottom: 26px; }

.mapa-t-num { font-family: "Roboto Condensed", "Arial Narrow", sans-serif; font-weight: 700; fill: #10151C; }
.mapa-t-placa { font-family: "Roboto Condensed", "Arial Narrow", sans-serif; font-weight: 700; fill: #131924; }

.mapa .armario[data-estado="livre"] { cursor: pointer; outline: none; }
.mapa .armario .porta-armario { transition: filter 140ms ease; }
.mapa .armario .anel { fill: none; stroke: none; }
.mapa .armario--selecionado .anel { stroke: var(--mapa-selecao); stroke-width: 3.6; }
.mapa .armario--selecionado .porta-armario { stroke: rgba(9, 21, 40, .9); stroke-width: 1.8; }

@media (hover: hover) and (pointer: fine) {
  .mapa .armario[data-estado="livre"]:hover .porta-armario { filter: brightness(1.18); }
}

.mapa-trilha { width: 100%; height: 44px; flex: none; }
.mapa-trilha svg { display: block; }
.mapa-trilha__alvo { fill: transparent; cursor: pointer; }
.mapa-trilha__seg { fill: color-mix(in srgb, var(--mapa-texto) 14%, transparent); pointer-events: none; }
.mapa-trilha__seg--atual { fill: var(--cor); }
.mapa-trilha__rotulo { font-size: 10px; font-weight: 700; fill: var(--mapa-texto-suave); pointer-events: none; }

.mapa-rodape { flex: none; min-height: 72px; display: flex; align-items: center; }
.mapa-legenda { list-style: none; margin: 0 auto; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 26px; color: var(--mapa-texto-suave); }
.mapa-legenda li { display: flex; align-items: center; gap: 9px; }
.mapa-amostra { width: 16px; height: 22px; border-radius: 4px; }
.mapa-amostra--livre { background: var(--mapa-livre); }
.mapa-amostra--ocupado { background: var(--mapa-ocupado); }
.mapa-amostra--manutencao { background: repeating-linear-gradient(45deg, var(--mapa-manutencao) 0 5px, #6F5D22 5px 8px); }

.mapa-selecao {
  width: 100%; display: flex; align-items: center; gap: 14px; padding: 10px 10px 10px 18px; border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--mapa-selecao) 35%, transparent); background: var(--mapa-carta);
}
.mapa-selecao__texto { flex: 1; min-width: 0; display: grid; gap: 2px; }
.mapa-selecao__texto strong { font-size: 19px; font-weight: 800; }
.mapa-selecao__texto span { font-size: 13px; color: var(--mapa-texto-suave); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mapa-selecao__alugar {
  flex: none; min-height: 52px; padding: 0 26px; border: 0; border-radius: 14px; cursor: pointer;
  background: var(--mapa-selecao); color: #0A1524; font-weight: 700; font-size: 16px;
}
.mapa-selecao__alugar:active { transform: scale(.96); }

@media (max-width: 640px) {
  .mapa { margin-inline: -12px; gap: 12px; }
  .mapa-planta { grid-template-columns: var(--colunas-r); grid-template-rows: var(--linhas-r); gap: 10px; }
  .mapa-planta > * { grid-area: var(--area-r); }
  .mapa-patio { border-radius: 17px; padding-left: var(--recuo-r, 0px); }
  .mapa-patio span { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 11px; letter-spacing: .4em; }
  .mapa-titulo { font-size: 22px; }
  .mapa-barra .mapa-pino { display: none; }
  .mapa-voltar span { display: none; }
  .mapa-voltar { padding: 0 12px; }
  .mapa-selecao { padding-left: 14px; gap: 10px; }
  .mapa-selecao__alugar { padding: 0 20px; }
}

/* totem: tela grande em pé, tudo maior para ser tocado de pé */
@media (min-width: 900px) and (max-aspect-ratio: 1/1) {
  .mapa { zoom: 1.5; height: calc((100dvh - 112px) / 1.5); }
}

@media (prefers-reduced-motion: reduce) {
  .mapa-trilho, .mapa-foco, .mapa-cartao, .mapa-seta { transition-duration: 1ms; }
}
```

- [ ] **Step 2: Planta**

`front/src/screens/Home/Planta.jsx`:

```jsx
export default function Planta({ planta, corredores, montados, aoEscolher }) {
  const grade = {
    '--colunas-p': planta.colunas_deitada,
    '--linhas-p': planta.linhas_deitada,
    '--colunas-r': planta.colunas_estreita,
    '--linhas-r': planta.linhas_estreita
  };

  const patio = {
    '--area-p': planta.patio_area_deitada,
    '--area-r': planta.patio_area_estreita,
    '--recuo-p': planta.patio_recuo_deitada || '0px',
    '--recuo-r': planta.patio_recuo_estreita || '0px'
  };

  return (
    <div className="mapa-planta" style={grade}>
      <div className="mapa-patio" style={patio}><span>Pátio</span></div>

      {corredores.map((corredor) => {
        const lay = montados.get(corredor.id);
        return (
          <button
            key={corredor.id}
            type="button"
            className="mapa-cartao"
            style={{ '--cor': corredor.cor, '--area-p': corredor.area_deitada, '--area-r': corredor.area_estreita }}
            onClick={() => aoEscolher(corredor.id)}
            aria-label={`${corredor.nome}, ${lay.livres} armários livres`}
          >
            <span className="mapa-cartao__corpo">
              <span className={`mapa-cartao__sigla${corredor.sigla.length > 1 ? ' mapa-cartao__sigla--longa' : ''}`}>
                {corredor.sigla}
              </span>
              <span className="mapa-cartao__texto">
                <span className="mapa-cartao__nome">
                  <span className="mapa-cartao__nome-longo">{corredor.nome}</span>
                  <span className="mapa-cartao__nome-curto">{corredor.nome_curto || corredor.nome}</span>
                </span>
                {lay.salas && <span className="mapa-cartao__salas">{lay.salas}</span>}
              </span>
              <span className="mapa-cartao__livres"><b>{lay.livres}</b><span>livres</span></span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `cd front && npm run build`
Expected: build sem erro (a Planta ainda não é usada; o Vite só confere se compila quando importada — a importação entra na Task 10, então aqui basta `npx eslint src/screens/Home/Planta.jsx` sem erro novo).

- [ ] **Step 4: Commit**

```bash
git add front/src/screens/Home/Mapa.css front/src/screens/Home/Planta.jsx
git commit -m "feat(mapa): planta da escola e estilos do mapa"
```

---

### Task 9: Cena do corredor, trilha e barra de seleção

**Files:**
- Create: `front/src/screens/Home/Parede.jsx`
- Create: `front/src/screens/Home/Trilha.jsx`
- Create: `front/src/screens/Home/BarraSelecao.jsx`

**Interfaces:**
- Consumes: `desenharParede` (Task 6), `enquadrar`, `ALTURA`, `MARGEM`, `Layout` (Task 5), classes de `Mapa.css` (Task 8).
- Produces:
  - `<Parede corredor lay paleta celular parada aoMudarParada={(indice) => void} selecionadoId aoTocarArmario={(id) => void} />`
  - `<Trilha lay parada aoEscolher={(indice) => void} />`
  - `<BarraSelecao armario={{ nome }} corredorNome local aoAlugar={() => void} />`

- [ ] **Step 1: Parede**

`front/src/screens/Home/Parede.jsx`:

```jsx
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { desenharParede } from './mapa/desenhoParede.js';
import { enquadrar, ALTURA, MARGEM } from './mapa/geometria.js';

const f = (n) => Math.round(n * 100) / 100;

// Leva a cena até a parada. O svg é redimensionado na escala final, para texto
// e etiqueta ficarem nítidos; a animação parte do quadro anterior convertido
// para essa escala nova.
function posicionarCena({ cena, trilho, focoEsq, focoDir }, lay, parada, celular, quadroAnterior, animar) {
  const svg = trilho?.firstElementChild;
  const alvo = lay.paradas[parada];
  if (!cena || !svg || !alvo) return quadroAnterior;

  const largura = cena.clientWidth;
  const quadro = enquadrar(lay, largura, cena.clientHeight, celular)[parada];

  svg.setAttribute('width', f((lay.comprimento + MARGEM * 2) * quadro.escala));
  svg.setAttribute('height', f(ALTURA * quadro.escala));

  trilho.style.transition = 'none';
  if (animar && quadroAnterior) {
    trilho.style.transform = `translate3d(${f(quadroAnterior.tx)}px, ${f(quadroAnterior.ty)}px, 0) scale(${quadroAnterior.escala / quadro.escala})`;
  }
  void trilho.offsetWidth;
  if (animar) trilho.style.transition = '';
  trilho.style.transform = `translate3d(${f(quadro.tx)}px, ${f(quadro.ty)}px, 0) scale(1)`;

  // no celular o que está fora da parada atual fica escurecido
  const inicio = quadro.tx + (alvo.centro - alvo.largura / 2 + MARGEM) * quadro.escala;
  const fim = quadro.tx + (alvo.centro + alvo.largura / 2 + MARGEM) * quadro.escala;
  focoEsq.style.transition = animar ? '' : 'none';
  focoDir.style.transition = animar ? '' : 'none';
  focoEsq.style.transform = `translateX(${f(inicio - 6 - largura)}px)`;
  focoDir.style.transform = `translateX(${f(fim + 6)}px)`;

  return quadro;
}

const Seta = ({ direcao }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={direcao === 'esq' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Parede({ corredor, lay, paleta, celular, parada, aoMudarParada, selecionadoId, aoTocarArmario }) {
  const cenaRef = useRef(null);
  const trilhoRef = useRef(null);
  const focoEsqRef = useRef(null);
  const focoDirRef = useRef(null);
  const quadroRef = useRef(null);
  const ultimoRef = useRef(null);
  const arrastoRef = useRef(null);
  const ignorarCliqueRef = useRef(false);

  const svg = useMemo(() => desenharParede(corredor, lay, paleta), [corredor, lay, paleta]);
  const ultima = lay.paradas.length - 1;
  const irPara = (indice) => aoMudarParada(Math.max(0, Math.min(ultima, indice)));

  // Anima só quando é a mesma parede e mudou a parada. Trocar de corredor,
  // de paleta ou entre celular e computador reposiciona sem deslizar.
  useLayoutEffect(() => {
    const ultimo = ultimoRef.current;
    const animar = Boolean(ultimo && ultimo.svg === svg && ultimo.celular === celular && ultimo.parada !== parada);
    const elementos = { cena: cenaRef.current, trilho: trilhoRef.current, focoEsq: focoEsqRef.current, focoDir: focoDirRef.current };
    quadroRef.current = posicionarCena(elementos, lay, parada, celular, animar ? quadroRef.current : null, animar);
    ultimoRef.current = { svg, celular, parada };
  }, [svg, lay, celular, parada]);

  // Observa a cena e a raiz: mudar só a altura da janela não redimensiona a cena.
  // O observer dispara ao começar a observar; comparar o tamanho evita que esse
  // disparo corte a animação da troca de parada.
  useEffect(() => {
    const cena = cenaRef.current;
    if (!cena) return undefined;
    let tamanho = `${cena.clientWidth}x${cena.clientHeight}`;

    const reposicionar = () => {
      const agora = `${cena.clientWidth}x${cena.clientHeight}`;
      if (agora === tamanho) return;
      tamanho = agora;
      const elementos = { cena, trilho: trilhoRef.current, focoEsq: focoEsqRef.current, focoDir: focoDirRef.current };
      quadroRef.current = posicionarCena(elementos, lay, parada, celular, null, false);
    };

    const observador = new ResizeObserver(reposicionar);
    observador.observe(cena);
    observador.observe(document.documentElement);
    window.addEventListener('resize', reposicionar);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', reposicionar);
    };
  }, [lay, parada, celular]);

  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    for (const g of trilho.querySelectorAll('.armario--selecionado')) {
      g.classList.remove('armario--selecionado');
      g.setAttribute('aria-pressed', 'false');
    }
    if (!selecionadoId) return;
    const g = trilho.querySelector(`.armario[data-id="${CSS.escape(selecionadoId)}"]`);
    if (g) {
      g.classList.add('armario--selecionado');
      g.setAttribute('aria-pressed', 'true');
    }
  }, [selecionadoId, svg]);

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === 'ArrowRight') aoMudarParada(Math.min(parada + 1, ultima));
      else if (e.key === 'ArrowLeft') aoMudarParada(Math.max(parada - 1, 0));
      else if (e.key === 'Escape' && selecionadoId) aoTocarArmario(selecionadoId);
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [parada, ultima, selecionadoId, aoMudarParada, aoTocarArmario]);

  const aoApertar = (e) => {
    arrastoRef.current = { x: e.clientX, moveu: false };
  };

  const aoMover = (e) => {
    const arrasto = arrastoRef.current;
    if (arrasto && Math.abs(e.clientX - arrasto.x) > 12) arrasto.moveu = true;
  };

  const aoSoltar = (e) => {
    const arrasto = arrastoRef.current;
    arrastoRef.current = null;
    if (!arrasto?.moveu) return;
    const deslocamento = e.clientX - arrasto.x;
    if (Math.abs(deslocamento) <= 45) return;
    irPara(parada + (deslocamento < 0 ? 1 : -1));
    // o click que vem depois do arrasto não pode selecionar armário
    ignorarCliqueRef.current = true;
    setTimeout(() => { ignorarCliqueRef.current = false; }, 0);
  };

  const armarioDoEvento = (e) => {
    const g = e.target.closest('.armario');
    return g?.dataset.estado === 'livre' ? g.dataset.id : null;
  };

  const aoClicar = (e) => {
    if (ignorarCliqueRef.current) return;
    const id = armarioDoEvento(e);
    if (id) aoTocarArmario(id);
  };

  const aoTeclarArmario = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const id = armarioDoEvento(e);
    if (!id) return;
    e.preventDefault();
    aoTocarArmario(id);
  };

  return (
    <div
      ref={cenaRef}
      className={`mapa-cena${celular ? ' mapa-cena--celular' : ''}`}
      onPointerDown={aoApertar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={() => { arrastoRef.current = null; }}
    >
      <div
        ref={trilhoRef}
        className="mapa-trilho"
        onClick={aoClicar}
        onKeyDown={aoTeclarArmario}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="mapa-vinheta" />
      <div ref={focoEsqRef} className="mapa-foco" onClick={() => irPara(parada - 1)} />
      <div ref={focoDirRef} className="mapa-foco" onClick={() => irPara(parada + 1)} />
      <span className="mapa-local">{lay.paradas[parada]?.local}</span>
      <button type="button" className="mapa-seta mapa-seta--esq" onClick={() => irPara(parada - 1)} disabled={parada === 0} aria-label="Bloco anterior">
        <Seta direcao="esq" />
      </button>
      <button type="button" className="mapa-seta mapa-seta--dir" onClick={() => irPara(parada + 1)} disabled={parada === ultima} aria-label="Próximo bloco">
        <Seta direcao="dir" />
      </button>
    </div>
  );
}
```

`desenharParede` escapa todo texto que vem do banco (testado na Task 6), por isso o `dangerouslySetInnerHTML` aqui recebe só conteúdo montado por nós.

- [ ] **Step 2: Trilha**

`front/src/screens/Home/Trilha.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';

const ALTURA = 44;

// Posição de cada segmento e quais rótulos cabem sem encostar no anterior.
function segmentosDaTrilha(lay, largura) {
  const escala = (largura - 8) / lay.comprimento;
  const segmentos = [];
  let fimUltimoRotulo = -Infinity;

  lay.paradas.forEach((parada, indice) => {
    const larguraSegmento = Math.max(parada.largura * escala - 4, 6);
    const x = 4 + parada.centro * escala - larguraSegmento / 2;
    const ehPorta = parada.tipo === 'porta';
    const altura = ehPorta ? 12 : 8;
    const meio = x + larguraSegmento / 2;
    const meiaLarguraRotulo = parada.rotulo.length * 3.4;
    const cabeRotulo = ehPorta && parada.rotulo && meio - meiaLarguraRotulo > fimUltimoRotulo + 4;
    if (cabeRotulo) fimUltimoRotulo = meio + meiaLarguraRotulo;

    segmentos.push({
      indice,
      x,
      y: 10 + (12 - altura) / 2,
      largura: larguraSegmento,
      altura,
      meio,
      rotulo: cabeRotulo ? parada.rotulo : null
    });
  });

  return segmentos;
}

export default function Trilha({ lay, parada, aoEscolher }) {
  const ref = useRef(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return undefined;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.round(entrada.contentRect.width)));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const W = Math.max(240, largura);
  const segmentos = segmentosDaTrilha(lay, W);

  return (
    <div ref={ref} className="mapa-trilha">
      <svg width={W} height={ALTURA} viewBox={`0 0 ${W} ${ALTURA}`} role="group" aria-label="Posição no corredor">
        {segmentos.map((s) => (
          <g key={s.indice}>
            {/* alvo invisível da altura inteira da trilha, para acertar com o dedo */}
            <rect className="mapa-trilha__alvo" x={s.x - 2} y={0} width={s.largura + 4} height={ALTURA} onClick={() => aoEscolher(s.indice)} />
            <rect
              className={`mapa-trilha__seg${s.indice === parada ? ' mapa-trilha__seg--atual' : ''}`}
              x={s.x}
              y={s.y}
              width={s.largura}
              height={s.altura}
              rx={s.altura / 2}
            />
            {s.rotulo && (
              <text className="mapa-trilha__rotulo" x={s.meio} y={ALTURA - 6} textAnchor="middle">{s.rotulo}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Barra de seleção**

`front/src/screens/Home/BarraSelecao.jsx`:

```jsx
export default function BarraSelecao({ armario, corredorNome, local, aoAlugar }) {
  return (
    <div className="mapa-selecao">
      <div className="mapa-selecao__texto">
        <strong>Armário {armario.nome}</strong>
        <span>{corredorNome} · {local}</span>
      </div>
      <button type="button" className="mapa-selecao__alugar" onClick={aoAlugar}>
        Alugar
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Lint dos arquivos novos**

Run: `cd front && npx eslint src/screens/Home/Parede.jsx src/screens/Home/Trilha.jsx src/screens/Home/BarraSelecao.jsx src/screens/Home/Planta.jsx`
Expected: nenhum erro. Se a regra `react-hooks/refs` reclamar de algum acesso a `ref.current`, mover o acesso para dentro do efeito ou do handler (nunca no corpo do componente).

- [ ] **Step 5: Commit**

```bash
git add front/src/screens/Home/Parede.jsx front/src/screens/Home/Trilha.jsx front/src/screens/Home/BarraSelecao.jsx
git commit -m "feat(mapa): cena do corredor com câmera, trilha e seleção"
```

---

### Task 10: Tela do aluno com o mapa

**Files:**
- Create: `front/src/screens/Home/MapaArmarios.jsx`
- Modify: `front/src/screens/Home/index.jsx`

**Interfaces:**
- Consumes: `Planta`, `Parede`, `Trilha`, `BarraSelecao` (Tasks 8–9), `montarCorredor` (Task 5), `paletaDoMapa`, `variaveisCss` (Task 5), `useMapaEscola`, `useCelular`, `GradeArmarios` (Task 7), `ModalArmario` (existente: `armario, escola, valorArmario, atingiuLimite, limiteArmarios, aoFechar, aoConfirmar`).
- Produces: `<MapaArmarios mapa={Mapa} />`; `Home` escolhe entre mapa e grade.

- [ ] **Step 1: Componente do mapa**

`front/src/screens/Home/MapaArmarios.jsx`:

```jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalArmario from '../../components/ModalArmario.jsx';
import { useEscola } from '../../theme/contextoEscola.js';
import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import { rotaEscola } from '../../utils/tenant.js';
import { useCelular } from '../../utils/useCelular.js';
import BarraSelecao from './BarraSelecao.jsx';
import Parede from './Parede.jsx';
import Planta from './Planta.jsx';
import Trilha from './Trilha.jsx';
import { montarCorredor } from './mapa/geometria.js';
import { paletaDoMapa, variaveisCss } from './mapa/estiloMapa.js';
import './Mapa.css';

const LEGENDA = [
  ['livre', 'Livre'],
  ['ocupado', 'Ocupado'],
  ['manutencao', 'Em manutenção']
];

export default function MapaArmarios({ mapa }) {
  const navigate = useNavigate();
  const schoolCode = useCodigoEscola();
  const { escola } = useEscola();
  const celular = useCelular();

  const [corredorId, setCorredorId] = useState(null);
  const [parada, setParada] = useState(0);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [aviso, setAviso] = useState(null);

  const paleta = useMemo(() => paletaDoMapa(mapa.estilo), [mapa.estilo]);
  const montados = useMemo(
    () => new Map(mapa.corredores.map((c) => [c.id, montarCorredor(c, mapa.armarios)])),
    [mapa]
  );

  const corredor = mapa.corredores.find((c) => c.id === corredorId) ?? null;
  const lay = corredor ? montados.get(corredor.id) : null;
  const armario = selecionadoId ? mapa.armarios.find((a) => a.id === selecionadoId) : null;
  const localDoArmario = armario && lay ? lay.itens.find((i) => i.id === armario.item_id)?.local : '';
  const totalLivres = mapa.armarios.filter((a) => a.estado === 'livre').length;

  // Só avisa antes do checkout. A trava de verdade continua no backend, em
  // iniciarCheckout, que também conta armários sem lugar no mapa.
  const limiteArmarios = Number(escola?.max_armarios_por_aluno) || 1;
  const atingiuLimite = mapa.armarios.filter((a) => a.meu).length >= limiteArmarios;

  const abrirCorredor = (id) => {
    setCorredorId(id);
    setParada(0);
    setSelecionadoId(null);
    setAviso(null);
  };

  const voltarParaPlanta = () => {
    setCorredorId(null);
    setSelecionadoId(null);
  };

  const tocarArmario = (id) => setSelecionadoId((atual) => (atual === id ? null : id));

  const irParaCheckout = () => {
    if (atingiuLimite) {
      setModalAberto(false);
      setAviso(limiteArmarios === 1
        ? 'Você já possui um armário reservado e não pode alugar outro.'
        : `Você já atingiu o limite de ${limiteArmarios} armários por aluno.`);
      return;
    }
    navigate(rotaEscola(schoolCode, 'checkout'), {
      state: { origemValida: true, armario, valorArmario: escola?.valor_armario || 0 }
    });
  };

  return (
    <div className="mapa" style={variaveisCss(paleta)}>
      {aviso && <div className="error-state" role="alert">{aviso}</div>}

      {!corredor ? (
        <>
          <header className="mapa-cabecalho">
            <div>
              <h2 className="mapa-titulo">Escolha o corredor</h2>
              <p className="mapa-dica">Toque no corredor onde você quer o armário.</p>
            </div>
            <span className="mapa-pino"><b>{totalLivres}</b> armários livres</span>
          </header>
          <Planta planta={mapa.planta} corredores={mapa.corredores} montados={montados} aoEscolher={abrirCorredor} />
        </>
      ) : (
        <>
          <header className="mapa-barra" style={{ '--cor': corredor.cor }}>
            <button type="button" className="mapa-voltar" onClick={voltarParaPlanta} aria-label="Voltar para a planta">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Planta</span>
            </button>
            <div className="mapa-barra__titulo">
              <span className="mapa-barra__sigla" aria-hidden="true">{corredor.sigla}</span>
              <div>
                <h2 className="mapa-barra__nome">{corredor.nome}</h2>
                <p className="mapa-barra__salas">{lay.salas}</p>
              </div>
            </div>
            <span className="mapa-pino"><b>{lay.livres}</b> livres</span>
          </header>

          <Parede
            corredor={corredor}
            lay={lay}
            paleta={paleta}
            celular={celular}
            parada={parada}
            aoMudarParada={setParada}
            selecionadoId={selecionadoId}
            aoTocarArmario={tocarArmario}
          />

          <div style={{ '--cor': corredor.cor }}>
            <Trilha lay={lay} parada={parada} aoEscolher={setParada} />
          </div>

          <div className="mapa-rodape">
            {armario ? (
              <BarraSelecao
                armario={armario}
                corredorNome={corredor.nome}
                local={localDoArmario}
                aoAlugar={() => setModalAberto(true)}
              />
            ) : (
              <ul className="mapa-legenda">
                {LEGENDA.map(([estado, rotulo]) => (
                  <li key={estado}><span className={`mapa-amostra mapa-amostra--${estado}`} />{rotulo}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <ModalArmario
        armario={modalAberto ? armario : null}
        escola={escola}
        valorArmario={escola?.valor_armario}
        atingiuLimite={atingiuLimite}
        limiteArmarios={limiteArmarios}
        aoFechar={() => setModalAberto(false)}
        aoConfirmar={irParaCheckout}
      />
    </div>
  );
}
```

`tocarArmario` muda a cada renderização e está nas dependências do efeito de teclado da `Parede`; isso só re-registra o listener, sem efeito visível. Não embrulhar em `useCallback` só para agradar o lint.

- [ ] **Step 2: Home escolhe entre mapa e grade**

`front/src/screens/Home/index.jsx`:

```jsx
import Carregando from '../../components/Carregando.jsx';
import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import { useMapaEscola } from '../../utils/useMapaEscola.js';
import GradeArmarios from './GradeArmarios.jsx';
import MapaArmarios from './MapaArmarios.jsx';

export default function Home() {
  const schoolCode = useCodigoEscola();
  const { mapa, carregando } = useMapaEscola(schoolCode);

  if (carregando) return <Carregando tela rotulo="Carregando armários" />;

  // Escola sem mapa cadastrado, ou mapa que não carregou: continua na grade.
  if (!mapa?.corredores?.length) return <GradeArmarios />;

  return <MapaArmarios mapa={mapa} />;
}
```

- [ ] **Step 3: Build e lint**

Run: `cd front && npm run build && npx eslint src/screens/Home src/utils/useCelular.js src/utils/useMapaEscola.js`
Expected: build sem erro; eslint sem erro nos arquivos novos (erros que já existiam em `GradeArmarios.jsx` vieram do antigo `index.jsx` e não contam).

- [ ] **Step 4: Commit**

```bash
git add front/src/screens/Home/MapaArmarios.jsx front/src/screens/Home/index.jsx
git commit -m "feat(mapa): tela do aluno com planta e parede do corredor"
```

---

### Task 11: Cores do mapa na Personalização

**Files:**
- Create: `front/src/screens/Personalizacao/CampoCor.jsx`
- Create: `front/src/screens/Personalizacao/SecaoMapa.jsx`
- Modify: `front/src/screens/Personalizacao/index.jsx`
- Modify: `front/src/screens/Personalizacao/Personalizacao.css`

**Interfaces:**
- Consumes: `CORES_EDITAVEIS`, `paletaDoMapa` (Task 5), `useMapaEscola` (Task 7), `mapa_estilo` no contrato da escola (Task 4).
- Produces: `<SecaoMapa estilo={object | null} aoMudar={(estilo) => void} corredores={Corredor[]} />`; `mapa_estilo` no payload de salvamento.

A seção entra na aba **Identidade visual**, abaixo das cores da escola, como o Miguel pediu: "na mesma aba de estilização, numa seção à parte".

- [ ] **Step 1: Mover o seletor de cor para arquivo próprio**

Recortar a função `CampoCor` inteira de `Personalizacao/index.jsx` (o comentário que a precede e o corpo) e colar em `front/src/screens/Personalizacao/CampoCor.jsx`, trocando a primeira linha para:

```jsx
export default function CampoCor({ titulo, ajuda, valor, aoMudar }) {
```

No topo de `index.jsx`, junto dos imports:

```jsx
import CampoCor from './CampoCor.jsx';
```

Run: `cd front && npm run build`
Expected: build sem erro (a tela continua igual).

- [ ] **Step 2: Seção do mapa**

`front/src/screens/Personalizacao/SecaoMapa.jsx`:

```jsx
import { CORES_EDITAVEIS, paletaDoMapa } from '../Home/mapa/estiloMapa.js';
import CampoCor from './CampoCor.jsx';

const MODOS = [
  { id: 'escuro', rotulo: 'Escuro (padrão)' },
  { id: 'claro', rotulo: 'Claro' },
  { id: 'personalizado', rotulo: 'Personalizado' }
];

export default function SecaoMapa({ estilo, aoMudar, corredores }) {
  const modo = estilo?.modo ?? 'escuro';
  const paleta = paletaDoMapa(estilo);

  const mudarModo = (novoModo) => {
    if (novoModo !== 'personalizado') {
      aoMudar({ ...(estilo ?? {}), modo: novoModo });
      return;
    }
    // Ao personalizar, cada cor começa no valor que a escola já está vendo.
    const base = paletaDoMapa(estilo);
    const cores = Object.fromEntries(CORES_EDITAVEIS.map(({ campo }) => [campo, base[campo]]));
    aoMudar({ ...(estilo ?? {}), ...cores, modo: 'personalizado' });
  };

  const mudarCor = (campo, valor) => aoMudar({ ...estilo, [campo]: valor });

  const mudarCorDoCorredor = (codigo, valor) =>
    aoMudar({ modo, ...(estilo ?? {}), corredores: { ...(estilo?.corredores ?? {}), [codigo]: valor } });

  return (
    <div className="lckp-card perso-card perso-mapa">
      <h3>Mapa de armários</h3>
      <p className="perso-ajuda">
        Cores da planta e da parede dos corredores que o aluno vê ao escolher o armário.
        Livre, ocupado e manutenção não mudam: significam a mesma coisa em qualquer escola.
      </p>

      <div className="perso-field">
        <label className="lckp-label" htmlFor="mapa-modo">Tema do mapa</label>
        <select id="mapa-modo" className="lckp-input" value={modo} onChange={(e) => mudarModo(e.target.value)}>
          {MODOS.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
        </select>
      </div>

      <div className="perso-mapa-previa" style={{ background: paleta.fundo }} aria-hidden="true">
        <div className="perso-mapa-previa__parede" style={{ background: paleta.parede }}>
          <span className="perso-mapa-previa__vidro" style={{ background: paleta.vidro }} />
          <span className="perso-mapa-previa__faixa" style={{ background: paleta.faixa }} />
          <span className="perso-mapa-previa__porta" style={{ background: paleta.porta }} />
          <span className="perso-mapa-previa__bloco" style={{ background: paleta.armario_claro }}>
            <i className="livre" /><i className="ocupado" /><i className="livre" style={{ outlineColor: paleta.selecao }} data-selecionado /><i className="livre" />
          </span>
          <span className="perso-mapa-previa__bloco" style={{ background: paleta.armario_escuro }}>
            <i className="ocupado" /><i className="livre" /><i className="manutencao" /><i className="livre" />
          </span>
        </div>
      </div>

      {modo === 'personalizado' && CORES_EDITAVEIS.map(({ campo, titulo }) => (
        <CampoCor key={campo} titulo={titulo} valor={estilo?.[campo] ?? paleta[campo]} aoMudar={(v) => mudarCor(campo, v)} />
      ))}

      {corredores.length > 0 && (
        <>
          <h4 className="perso-mapa__subtitulo">Cor de cada corredor</h4>
          {corredores.map((c) => (
            <CampoCor
              key={c.id}
              titulo={c.nome}
              valor={estilo?.corredores?.[c.codigo] ?? c.cor}
              aoMudar={(v) => mudarCorDoCorredor(c.codigo, v)}
            />
          ))}
        </>
      )}

      <button type="button" className="lckp-btn lckp-btn--ghost" onClick={() => aoMudar(null)} disabled={estilo === null}>
        Voltar ao padrão
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Estilos da prévia**

Acrescentar ao fim de `front/src/screens/Personalizacao/Personalizacao.css`:

```css
/* Prévia do mapa de armários: uma porta e dois blocos com as cores escolhidas. */
.perso-mapa__subtitulo { margin: 18px 0 6px; font-size: 14px; }

.perso-mapa-previa { border-radius: 14px; padding: 14px; margin: 10px 0 16px; }

.perso-mapa-previa__parede {
  position: relative; height: 130px; border-radius: 8px; overflow: hidden;
  display: flex; align-items: flex-end; gap: 8px; padding: 0 16px 10px;
}

.perso-mapa-previa__vidro { position: absolute; left: 0; right: 0; top: 8px; height: 22px; opacity: .9; }
.perso-mapa-previa__faixa { position: absolute; left: 0; right: 0; bottom: 0; height: 42%; }
.perso-mapa-previa__porta { position: relative; width: 38px; height: 92px; border-radius: 2px; }

.perso-mapa-previa__bloco {
  position: relative; width: 52px; height: 74px; padding: 4px; border-radius: 3px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 3px;
}

.perso-mapa-previa__bloco i { border-radius: 2px; }
.perso-mapa-previa__bloco .livre { background: #3D7BEA; }
.perso-mapa-previa__bloco .ocupado { background: #DC4438; }
.perso-mapa-previa__bloco .manutencao { background: repeating-linear-gradient(45deg, #F0BE2C 0 4px, #6F5D22 4px 6px); }
.perso-mapa-previa__bloco [data-selecionado] { outline: 2px solid; outline-offset: 1px; }
```

- [ ] **Step 4: Estado, alteração pendente e payload**

Em `front/src/screens/Personalizacao/index.jsx`:

1. Imports:

```jsx
import SecaoMapa from './SecaoMapa.jsx';
import { useMapaEscola } from '../../utils/useMapaEscola.js';
```

2. Logo depois de `const [temaModo, setTemaModo] = useState('auto');`:

```jsx
  // Cores do mapa de armários. null = tema escuro padrão.
  const [mapaEstilo, setMapaEstilo] = useState(null);
  const { mapa: mapaDaEscola } = useMapaEscola(escola?.codigo);
```

3. No bloco que preenche o formulário, depois de `setTemaModo(escola.tema_modo || 'auto');`:

```jsx
    setMapaEstilo(escola.mapa_estilo ?? null);
```

4. Em `temAlteracao`, adicionar ao array `pares`:

```jsx
      [JSON.stringify(mapaEstilo), JSON.stringify(escola.mapa_estilo ?? null)],
```

e `mapaEstilo` ao fim da lista de dependências do `useMemo`.

5. No `payload` de `handleSalvar`, depois de `tema_modo: temaModo,`:

```jsx
      mapa_estilo: mapaEstilo,
```

6. Dentro de `{aba === 'identidade' && ( <div className="perso-grid"> ... )}`, como último filho do `perso-grid`:

```jsx
        <SecaoMapa estilo={mapaEstilo} aoMudar={setMapaEstilo} corredores={mapaDaEscola?.corredores ?? []} />
```

- [ ] **Step 5: Build e lint**

Run: `cd front && npm run build && npx eslint src/screens/Personalizacao`
Expected: build sem erro; eslint sem erro novo em relação à contagem da Task 7 Step 1.

- [ ] **Step 6: Commit**

```bash
git add front/src/screens/Personalizacao
git commit -m "feat(personalizacao): cores do mapa de armários"
```

---

### Task 12: Verificação, SQL no Supabase e PR

**Files:**
- Nenhum arquivo novo no repositório. O mapa simulado fica no scratchpad da sessão.

**Interfaces:**
- Consumes: tudo das Tasks 1–11.

- [ ] **Step 1: Testes e build**

Run:
```bash
cd Backend && npm test
cd ../front && npm test && npm run build
```
Expected: todos PASS; build sem erro.

- [ ] **Step 2: Lint comparado**

Run: `cd front && npx eslint . 2>&1 | tail -3`
Expected: número de problemas igual ou menor que o anotado na Task 7 Step 1. Se aumentou, `npx eslint . --format unix | grep -E "Home/(MapaArmarios|Parede|Planta|Trilha|BarraSelecao)|mapa/|Personalizacao/(SecaoMapa|CampoCor)|useCelular|useMapaEscola"` mostra os que são desta entrega; corrigir esses.

- [ ] **Step 3: Gerar um mapa simulado**

Fora do repositório (no scratchpad), `gerar-mapa-simulado.mjs`, trocando `REPO` pelo caminho absoluto do clone:

```js
import mapa from 'file:///REPO/Backend/scripts/mapas/bentoQuirino.js';
import { posicoesDoBloco } from 'file:///REPO/Backend/scripts/gerarSqlMapa.js';

const estados = ['livre', 'livre', 'ocupado', 'livre', 'ocupado', 'manutencao'];
const corredores = [];
const armarios = [];

mapa.corredores.forEach((corredor, ci) => {
  const itens = corredor.itens.map((item, ii) => {
    const id = `i-${ci}-${ii}`;
    if (item.tipo === 'bloco') {
      for (const p of posicoesDoBloco(item.colunas)) {
        armarios.push({
          id: `a-${p.numero}`, nome: String(p.numero).padStart(3, '0'), corredor: corredor.codigo,
          item_id: id, coluna: p.coluna, linha: p.linha, estado: estados[(p.numero * 7) % estados.length], meu: false
        });
      }
    }
    const { colunas: _colunas, estimado: _estimado, ...resto } = item;
    return { id, numero: null, rotulo: null, variante: null, tom: null, larguras: null, ...resto };
  });
  const { itens: _itens, ...dados } = corredor;
  corredores.push({ id: `c-${ci}`, ...dados, itens });
});

process.stdout.write(JSON.stringify({ planta: mapa.planta, estilo: null, corredores, armarios }));
```

Run: `node gerar-mapa-simulado.mjs > mapa-simulado.json`

- [ ] **Step 4: Abrir a tela com o mapa simulado**

1. `cd front && npm run dev`.
2. Ler `front/src/components/ProtectedRoute.jsx` e `front/src/theme/EscolaContext.jsx` para saber quais chamadas a tela faz antes de chegar no Home (sessão em `sessionStorage.usuario`, busca da escola por código).
3. No Playwright: gravar `sessionStorage.usuario = { id: 'aluno-teste', role: 'aluno', school_id: '<id usado no mock da escola>', token: 'teste' }`, interceptar com `page.route` a busca da escola (responder um objeto com `codigo: 'etec-043'`, `max_armarios_por_aluno: 1`, `valor_armario: 100`) e `**/armarios/escola/*/mapa` (responder `mapa-simulado.json`), e abrir `http://localhost:5173/etec-043/home`.

- [ ] **Step 5: Conferir no celular (390×844)**

- Planta: Mecânica à esquerda no alto, pátio contornando por baixo, corredores 3, 2 e 1 empilhados à direita; nenhum texto cortado.
- Corredor 3: primeira parada é a porta da Sala 13 com a placa inteira; a próxima é o bloco 379–398 de ponta a ponta; setas na faixa de baixo sem cobrir armário; o estoque não é parada; a última parada é a Sala 15.
- Corredor 2: última parada é a Sala 12, com o Salão Nobre visível ao lado.
- Tocar num armário livre seleciona (contorno dourado) e mostra a barra; tocar de novo desmarca; tocar num ocupado não faz nada.
- "Alugar" abre o `ModalArmario` com o número certo; confirmar navega para `/etec-043/checkout` com o armário no `location.state`.
- Tirar screenshot da planta e de um bloco selecionado.

- [ ] **Step 6: Conferir no computador (1440×860) e no totem (1080×1920)**

- Computador: setas nas laterais da cena, placas não encostam no topo, trilha com números de sala sem sobreposição.
- Totem: tudo ampliado, cartões da planta preenchem a tela.
- Voltar à planta e entrar em outro corredor não faz a parede deslizar atravessando a tela.
- Screenshot de cada um.

- [ ] **Step 7: Conferir a grade para escola sem mapa**

Trocar a resposta interceptada do mapa por `{ "corredores": [] }` e recarregar.
Expected: aparece a grade paginada de sempre.

- [ ] **Step 8: Conferir a Personalização**

Com `sessionStorage.usuario.role = 'admin'`, abrir `/etec-043/personalizacao`, aba Identidade visual:
- A seção "Mapa de armários" aparece abaixo das cores.
- Trocar o tema para Personalizado mostra os oito seletores já preenchidos com as cores do escuro.
- Mudar a cor do Corredor 1 acende "Alterações não salvas"; "Voltar ao padrão" limpa.
- Interceptar o `PATCH /schools/:id` e conferir que o corpo leva `mapa_estilo` no formato do spec.

- [ ] **Step 9: Push e PR**

```bash
git push -u origin feat/mapa-corredores
gh pr create --base main --title "feat(mapa): planta e parede do corredor na escolha de armário" --body-file -
```

Corpo do PR:

```markdown
## O que muda

A escolha de armário deixa de ser uma grade paginada e passa a ser:

- **Planta** da escola vista de cima, com o pátio e os corredores nas cores reais.
- **Parede** de cada corredor, com salas, placas e blocos de armários no formato das fotos. O aluno anda bloco a bloco e toca no armário livre; "Alugar" abre o modal de sempre.

No celular cada parada ocupa a tela inteira e as setas ficam fora de cima dos armários. No totem tudo fica ampliado.

Escola sem mapa cadastrado continua exatamente na grade atual.

## Banco (rodar no SQL Editor, nesta ordem)

1. `Backend/sql/2026-09-16-mapa-corredores.sql` — tabelas `plantas`, `corredores`, `corredor_itens`; posição em `lockers`; `schools.mapa_estilo`.
2. `Backend/sql/2026-09-16-mapa-bento-quirino.sql` — carga do Bento Quirino, gerada por `Backend/scripts/gerarSqlMapa.js`. As três consultas do fim mostram armários sem lugar e números que não bateram.

## Personalização

Nova seção "Mapa de armários" na aba Identidade visual: tema escuro (padrão), claro ou personalizado, e a cor de cada corredor.

## Privacidade

O endpoint novo `GET /armarios/escola/:schoolCode/mapa` não devolve `usuario_id` nem nome de ocupante; o aluno só sabe qual armário é o dele.

## Testes

- `cd Backend && npm test` e `cd front && npm test` (node:test, sem dependência nova).
- Tela conferida com mapa simulado em 390×844, 1440×860 e 1080×1920.

Spec: `docs/superpowers/specs/2026-09-16-mapa-corredores-design.md`
Plano: `docs/superpowers/plans/2026-09-16-mapa-corredores.md`
```

- [ ] **Step 10: Entregar o SQL para o Miguel**

O SQL não é aplicado por nós (sem acesso ao Supabase por ferramenta). Mandar a ele, nesta ordem:
1. Rodar `2026-09-16-mapa-corredores.sql` e conferir que as duas consultas do fim listam as 3 tabelas e as 3 colunas.
2. Rodar `2026-09-16-mapa-bento-quirino.sql` e mandar de volta o resultado das três conferências.
3. Com os números que não bateram, corrigir `Backend/scripts/mapas/bentoQuirino.js`, gerar o SQL de novo (Task 3 Step 6) e rodar outra vez — a carga é idempotente.
4. Repor a service key no `Backend/.env` local para o teste ponta a ponta: escolher um armário livre de verdade, abrir o modal e chegar no checkout com o armário certo.
