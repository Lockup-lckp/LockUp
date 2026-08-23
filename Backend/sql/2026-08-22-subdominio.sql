-- O endereço deixa de ser a identidade da escola.
--
-- Até aqui o `codigo` era as duas coisas ao mesmo tempo: o identificador da
-- instituição no sistema E o subdomínio pelo qual o aluno chega. Isso obrigou a
-- migração de 2026-08-18 a renomear 'etec-043' para 'etec-bentoquirino' só para
-- o endereço ficar apresentável — e arrastou junto tudo que apontava para o
-- código antigo.
--
-- Agora são campos separados:
--
--   codigo      = a identidade. 'etec-043', o número da unidade no Centro
--                 Paula Souza. É o que login, armários, usuários, pagamentos e
--                 o webhook do gateway usam.
--   subdominio  = o endereço. 'etec-bentoquirino', o que vai no cartaz da
--                 parede e no e-mail da secretaria.
--
-- Trocar o endereço passa a ser inofensivo: nada no sistema depende dele além
-- da resolução inicial da escola.
--
-- EFEITO COLATERAL BOM: a URL de webhook registrada no PagBank carrega o código
-- no caminho (/pagamentos/webhook/pagbank/<codigo>). Ela foi cadastrada como
-- 'etec-043' e parou de casar com a renomeação. Voltando o código, ela volta a
-- casar — sem precisar registrar de novo.

ALTER TABLE schools ADD COLUMN IF NOT EXISTS subdominio TEXT;

-- Único: dois endereços iguais fariam a resolução por hostname devolver a
-- escola errada, e o erro apareceria como "os dados de outra instituição".
CREATE UNIQUE INDEX IF NOT EXISTS schools_subdominio_unico
  ON schools (LOWER(subdominio))
  WHERE subdominio IS NOT NULL;

-- Bento Quirino: devolve o código e grava o endereço.
UPDATE schools
   SET codigo = 'etec-043',
       subdominio = 'etec-bentoquirino'
 WHERE codigo = 'etec-bentoquirino';

-- Escolas que ainda não têm endereço próprio continuam sendo alcançadas pelo
-- código, tanto no caminho (lckp.com.br/<codigo>) quanto no subdomínio.
-- Nada a fazer para elas.

COMMENT ON COLUMN schools.codigo IS
  'Identidade da instituição no sistema. Usada por login, armários, pagamentos e webhook.';
COMMENT ON COLUMN schools.subdominio IS
  'Endereço público (<subdominio>.lckp.com.br). Só resolve a escola; nada depende dele.';

-- Conferência.
SELECT codigo, subdominio, name FROM schools ORDER BY codigo;
