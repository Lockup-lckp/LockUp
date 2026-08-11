-- =====================================================================
-- LCKP — contrato de locação da APM Etec Bento Quirino
-- Rodar DEPOIS de 2026-08-11-modalidade-e-contrato.sql (cria as colunas).
-- =====================================================================
--
-- Transcrito do documento oficial fornecido pela escola em 2026-08-11
-- ("Contrato de Locação de Armário 2026").
--
-- Ficaram DE FORA os campos manuscritos do formulário impresso — nome do
-- aluno, curso, número do armário, valor, assinaturas. No sistema esses
-- dados já existem: o aluno está autenticado, o armário e o valor vêm da
-- locação, e o aceite fica registrado em rentals com data e hora.
--
-- O contrato é entre o ALUNO e a APM — não entre o aluno e a LCKP. Por isso
-- vive por escola, e não como texto único da plataforma.

UPDATE schools
   SET contrato_titulo = 'Contrato de Locação de Armário — APM Etec Bento Quirino',
       contrato_texto = 'O armário é da escola. A aquisição de armários na ETEC Bento Quirino é feita pela APM Etec Bento Quirino,, sob total responsabilidade da mesma.

Os horários de locação dos armários serão divulgados no mural da Secretaria no pátio, no site da escola e nas redes sociais.

Impreterivelmente, até o dia 18 de dezembro (anual) ou 06 de julho (semestral), todos os armários deverão ser desocupados, inclusive os livros devem ser retirados e entregues a coordenação do núcleo comum, para passarem por limpeza e manutenção, e serem reorganizados para o ano seguinte. Assim, o aluno deve retirar todos os seus pertences ao fim do ano letivo. A escola não se responsabilizará por pertences deixados nos armários.

Materiais que permanecerem nos armários após o prazo para retirada dos mesmos, serão doados.

A escola se reserva o direito de solicitar a abertura de qualquer armário em caso de necessidade.

Por amostragem será feita a vistoria nos armários dos alunos, em qualquer dia e horário, sendo que o mesmo deverá abrir e acompanhar a vistoria de seu armário, diante de um membro da equipe diretiva ou coordenação, registrando-se na ficha individual as eventuais irregularidades que serão também levadas ao conhecimento de seus pais ou responsáveis.

É PROIBIDO colar adesivos, escrever, desenhar ou fazer qualquer tipo de anotação na porta dos armários ou em qualquer parte da estrutura do mesmo. Se trata de um patrimônio público.

Armários que forem rasurados, quebrados ou pixados, Será cobrado do aluno ou do responsável, uma porta nova. Se o dano atingir outras portas, será averiguado a troca do módulo inteiro.

É vedada a colocação de qualquer objeto na parte externa, em cima ou em baixo dos armários.

O cadeado para segurança das portas de cada armário é de total responsabilidade do aluno que contratou o serviço.

Não será de responsabilidade da escola, o desaparecimento de objetos ou pertences dentro de armários sem cadeado.

Não é permitido armazenar ou guardar ALIMENTOS dentro dos armários ou qualquer objetivo que gere mal cheiro.

Os armários devem ser usados somente para guardar material didático

Para não dificultar o andamento das aulas, os armários deverão ser utilizados somente no horário que o aluno não estiver em aula.

Questões referentes à manutenção ou problemas nos armários devem ser protocoladas na secretaria, que serão direcionadas para providencia.

O aluno deverá devolver o armário nas condições em que o recebeu, ou seja, em perfeito estado de conservação e limpeza, até o dia 18 de dezembro (anual) ou 06 de julho (semestral)

É proibida a troca de armários entre alunos.

É proibida a abertura e/ou manuseio do conteúdo de qualquer armário que não seja o atribuído pela APM da escola ao aluno.

Eventuais custos com reparo do armário, devido à utilização inadequada, serão cobrados do(s) usuário(s).

Em caso de pandemia, terremoto, catástrofes naturais ou algo do tipo que não sejam de responsabilidade da APM ou da Etec Bento Quirino, impossibilitando o uso do armário em um determinado período de tempo, não nos responsabilizamos pela devolução do dinheiro investido.'
 WHERE codigo = 'etec-043';

-- Conferência:
--   SELECT codigo, contrato_titulo, LENGTH(contrato_texto) AS tamanho
--     FROM schools WHERE contrato_texto IS NOT NULL;
