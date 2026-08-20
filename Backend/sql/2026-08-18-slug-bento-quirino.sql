-- Troca o código da ETEC Bento Quirino: etec-043 -> etec-bentoquirino
--
-- POR QUE AGORA. O código deixou de ser só um segmento de URL: com o portal
-- por subdomínio ele VIRA o endereço da escola
-- (etec-bentoquirino.lckp.com.br). E o endereço vai para contrato assinado,
-- e-mail enviado e link que aluno compartilha — trocar depois invalida tudo
-- isso. Nada está em produção ainda, então esta é a última janela barata.
--
-- 'etec-043' era o número da unidade no Centro Paula Souza. Não diz nada a um
-- aluno digitando o endereço no celular.
--
-- O QUE NÃO MUDA. Nenhuma outra tabela referencia o código: users, lockers e
-- rentals apontam para schools.id (uuid). A troca é de um rótulo, não de
-- identidade — nenhum vínculo se perde.
--
-- O QUE PRECISA ACOMPANHAR, fora do banco:
--   - CORS_ORIGINS, se listar o host antigo
--   - a URL de webhook registrada no gateway, que carrega o código no caminho
--     (/pagamentos/webhook/pagbank/<codigo>)

UPDATE schools
   SET codigo = 'etec-bentoquirino'
 WHERE codigo = 'etec-043';

-- Conferência: deve devolver exatamente uma linha, com o nome da escola certo.
--   SELECT codigo, name FROM schools WHERE codigo = 'etec-bentoquirino';
