-- Código antigo da escola continua encontrável
--
-- O QUE ACONTECEU. A migração 2026-08-18 trocou o código da ETEC Bento Quirino
-- de 'etec-043' para 'etec-bentoquirino'. A troca em si estava certa — com o
-- portal por subdomínio o código virou o ENDEREÇO da escola, e "043" é o número
-- da unidade no Centro Paula Souza, que não diz nada a um aluno digitando no
-- celular.
--
-- O QUE FALTOU. Nada ficou apontando para o código velho. Quem digitava
-- 'etec-043' na busca da landing caía num endereço que carregava a página e
-- morria em silêncio, porque a consulta é `.eq('codigo', ...)` e ponto.
--
-- POR QUE UMA COLUNA, E NÃO UM CASO ESPECIAL NO CÓDIGO. O código da escola vai
-- para contrato assinado, e-mail enviado, QR impresso e link que aluno manda no
-- grupo. Toda renomeação futura vai ter o mesmo problema, e resolver com um
-- `if (codigo === 'etec-043')` em algum controlador seria dívida na certa.
-- Com a coluna, renomear passa a ter um lugar óbvio para registrar o de onde
-- se veio, e a rede de segurança vale para qualquer escola.
--
-- Depois de rodar, o backend passa a encontrar a escola pelos dois códigos, e o
-- portal redireciona o endereço antigo para o atual.

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS codigo_anterior text;

COMMENT ON COLUMN schools.codigo_anterior IS
  'Código pelo qual esta escola já foi conhecida. A busca cai aqui quando não '
  'acha por `codigo`, para links antigos (contrato, e-mail, QR impresso) não '
  'morrerem numa renomeação. O portal redireciona para o código atual.';

-- Único, mas permitindo vários NULL: duas escolas não podem reivindicar o
-- mesmo código antigo, senão a busca vira ambígua.
CREATE UNIQUE INDEX IF NOT EXISTS schools_codigo_anterior_unico
  ON schools (codigo_anterior)
  WHERE codigo_anterior IS NOT NULL;

-- Um código antigo nunca pode colidir com o código ATUAL de outra escola: se
-- colidisse, a escola certa ganharia (a busca por `codigo` vem primeiro) e a
-- outra ficaria inalcançável pelo antigo, sem erro nenhum aparecendo.
ALTER TABLE schools
  DROP CONSTRAINT IF EXISTS schools_codigo_anterior_difere_do_atual;
ALTER TABLE schools
  ADD CONSTRAINT schools_codigo_anterior_difere_do_atual
  CHECK (codigo_anterior IS NULL OR codigo_anterior <> codigo);

-- A renomeação que motivou tudo isto.
UPDATE schools
   SET codigo_anterior = 'etec-043'
 WHERE codigo = 'etec-bentoquirino'
   AND codigo_anterior IS DISTINCT FROM 'etec-043';

-- Conferência: deve devolver uma linha, 'etec-bentoquirino' | 'etec-043'.
--   SELECT codigo, codigo_anterior, name FROM schools WHERE codigo_anterior = 'etec-043';
