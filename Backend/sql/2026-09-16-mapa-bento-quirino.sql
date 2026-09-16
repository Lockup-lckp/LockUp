-- Carga do mapa de corredores da escola etec-043.
-- Gerado por Backend/scripts/gerarSqlMapa.js. Não edite à mão: mude os dados e gere de novo.
-- Rodar DEPOIS de 2026-09-16-mapa-corredores.sql. Pode ser rodado de novo: recarrega o mapa inteiro.

BEGIN;

DO $$
DECLARE
  v_escola UUID;
  v_corredor UUID;
  v_item UUID;
BEGIN
  SELECT id INTO v_escola FROM schools WHERE codigo = 'etec-043';
  IF v_escola IS NULL THEN RAISE EXCEPTION 'Escola etec-043 não encontrada.'; END IF;

  UPDATE lockers SET item_id = NULL, coluna = NULL, linha = NULL WHERE school_id = v_escola;
  DELETE FROM corredores WHERE school_id = v_escola;

  INSERT INTO plantas (school_id, colunas_deitada, linhas_deitada, colunas_estreita, linhas_estreita,
    patio_area_deitada, patio_area_estreita, patio_recuo_deitada, patio_recuo_estreita)
  VALUES (v_escola, 'minmax(0, 1fr) minmax(0, .9fr) minmax(0, 1.25fr)', 'repeat(6, minmax(0, 1fr))', 'minmax(0, 1fr) 34px minmax(0, 1.6fr)', 'repeat(6, minmax(0, 1fr))', '1 / 1 / 7 / 3', '1 / 1 / 7 / 3', 'calc((100% - 14px) / 1.9 + 14px)', 'calc(100% - 34px)')
  ON CONFLICT (school_id) DO UPDATE SET
    colunas_deitada = EXCLUDED.colunas_deitada, linhas_deitada = EXCLUDED.linhas_deitada,
    colunas_estreita = EXCLUDED.colunas_estreita, linhas_estreita = EXCLUDED.linhas_estreita,
    patio_area_deitada = EXCLUDED.patio_area_deitada, patio_area_estreita = EXCLUDED.patio_area_estreita,
    patio_recuo_deitada = EXCLUDED.patio_recuo_deitada, patio_recuo_estreita = EXCLUDED.patio_recuo_estreita;

  -- Corredor 1
  INSERT INTO corredores (school_id, codigo, nome, nome_curto, sigla, cor, ordem, area_deitada, area_estreita)
  VALUES (v_escola, '1', 'Corredor 1', 'Corredor', '1', '#F5C542', 1, '5 / 3 / 7 / 4', '5 / 3 / 7 / 4') RETURNING id INTO v_corredor;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 1, 'portal', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 2, 'porta', '01', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 3, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (1, 0, 0), (5, 0, 1), (9, 0, 2), (13, 0, 3), (17, 0, 4), (2, 1, 0), (6, 1, 1), (10, 1, 2), (14, 1, 3), (18, 1, 4), (3, 2, 0), (7, 2, 1), (11, 2, 2), (15, 2, 3), (19, 2, 4), (4, 3, 0), (8, 3, 1), (12, 3, 2), (16, 3, 3), (20, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 4, 'porta', '02', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 5, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (21, 0, 0), (25, 0, 1), (29, 0, 2), (33, 0, 3), (37, 0, 4), (22, 1, 0), (26, 1, 1), (30, 1, 2), (34, 1, 3), (38, 1, 4), (23, 2, 0), (27, 2, 1), (31, 2, 2), (35, 2, 3), (39, 2, 4), (24, 3, 0), (28, 3, 1), (32, 3, 2), (36, 3, 3), (40, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 6, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (41, 0, 0), (45, 0, 1), (49, 0, 2), (53, 0, 3), (57, 0, 4), (42, 1, 0), (46, 1, 1), (50, 1, 2), (54, 1, 3), (58, 1, 4), (43, 2, 0), (47, 2, 1), (51, 2, 2), (55, 2, 3), (59, 2, 4), (44, 3, 0), (48, 3, 1), (52, 3, 2), (56, 3, 3), (60, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 7, 'porta', '03', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 8, 'lixeira', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 9, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (61, 0, 0), (65, 0, 1), (69, 0, 2), (73, 0, 3), (77, 0, 4), (81, 0, 5), (62, 1, 0), (66, 1, 1), (70, 1, 2), (74, 1, 3), (78, 1, 4), (82, 1, 5), (63, 2, 0), (67, 2, 1), (71, 2, 2), (75, 2, 3), (79, 2, 4), (83, 2, 5), (64, 3, 0), (68, 3, 1), (72, 3, 2), (76, 3, 3), (80, 3, 4), (84, 3, 5)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 10, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[46, 46, 46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (85, 0, 0), (89, 0, 1), (93, 0, 2), (86, 1, 0), (90, 1, 1), (94, 1, 2), (87, 2, 0), (91, 2, 1), (95, 2, 2), (88, 3, 0), (92, 3, 1), (96, 3, 2)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 11, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[38, 38, 38, 38]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (97, 0, 0), (101, 0, 1), (105, 0, 2), (109, 0, 3), (98, 1, 0), (102, 1, 1), (106, 1, 2), (110, 1, 3), (99, 2, 0), (103, 2, 1), (107, 2, 2), (111, 2, 3), (100, 3, 0), (104, 3, 1), (108, 3, 2), (112, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 12, 'porta', '04', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 13, 'hidrante', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 14, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (113, 0, 0), (119, 0, 1), (125, 0, 2), (131, 0, 3), (137, 0, 4), (114, 1, 0), (120, 1, 1), (126, 1, 2), (132, 1, 3), (138, 1, 4), (115, 2, 0), (121, 2, 1), (127, 2, 2), (133, 2, 3), (139, 2, 4), (116, 3, 0), (122, 3, 1), (128, 3, 2), (134, 3, 3), (140, 3, 4), (117, 4, 0), (123, 4, 1), (129, 4, 2), (135, 4, 3), (141, 4, 4), (118, 5, 0), (124, 5, 1), (130, 5, 2), (136, 5, 3), (142, 5, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 15, 'extintor', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 16, 'porta', '05', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 17, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (143, 0, 0), (145, 0, 1), (147, 0, 2), (149, 0, 3), (151, 0, 4), (144, 1, 0), (146, 1, 1), (148, 1, 2), (150, 1, 3), (152, 1, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 18, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[46, 46, 46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (153, 0, 0), (157, 0, 1), (154, 1, 0), (158, 1, 1), (155, 2, 0), (159, 2, 1), (156, 3, 0), (160, 3, 1)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 19, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[46, 46, 46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (161, 0, 0), (165, 0, 1), (162, 1, 0), (166, 1, 1), (163, 2, 0), (167, 2, 1), (164, 3, 0), (168, 3, 1)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 20, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[38, 38, 38, 38]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (169, 0, 0), (173, 0, 1), (177, 0, 2), (181, 0, 3), (170, 1, 0), (174, 1, 1), (178, 1, 2), (182, 1, 3), (171, 2, 0), (175, 2, 1), (179, 2, 2), (183, 2, 3), (172, 3, 0), (176, 3, 1), (180, 3, 2), (184, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 21, 'porta', '06', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 22, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[46, 46, 46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (189, 0, 0), (193, 0, 1), (197, 0, 2), (190, 1, 0), (194, 1, 1), (198, 1, 2), (191, 2, 0), (195, 2, 1), (199, 2, 2), (192, 3, 0), (196, 3, 1), (200, 3, 2)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 23, 'porta', '07', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 24, 'fundo', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;

  -- Corredor 2
  INSERT INTO corredores (school_id, codigo, nome, nome_curto, sigla, cor, ordem, area_deitada, area_estreita)
  VALUES (v_escola, '2', 'Corredor 2', 'Corredor', '2', '#F28A30', 2, '3 / 3 / 5 / 4', '3 / 3 / 5 / 4') RETURNING id INTO v_corredor;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 1, 'portal', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 2, 'porta', '08', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 3, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[38, 38, 38, 38]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (205, 0, 0), (209, 0, 1), (213, 0, 2), (217, 0, 3), (206, 1, 0), (210, 1, 1), (214, 1, 2), (218, 1, 3), (207, 2, 0), (211, 2, 1), (215, 2, 2), (219, 2, 3), (208, 3, 0), (212, 3, 1), (216, 3, 2), (220, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 4, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (221, 0, 0), (225, 0, 1), (229, 0, 2), (233, 0, 3), (237, 0, 4), (222, 1, 0), (226, 1, 1), (230, 1, 2), (234, 1, 3), (238, 1, 4), (223, 2, 0), (227, 2, 1), (231, 2, 2), (235, 2, 3), (239, 2, 4), (224, 3, 0), (228, 3, 1), (232, 3, 2), (236, 3, 3), (240, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 5, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (241, 0, 0), (245, 0, 1), (249, 0, 2), (253, 0, 3), (242, 1, 0), (246, 1, 1), (250, 1, 2), (254, 1, 3), (243, 2, 0), (247, 2, 1), (251, 2, 2), (255, 2, 3), (244, 3, 0), (248, 3, 1), (252, 3, 2), (256, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 6, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (589, 0, 0), (593, 0, 1), (597, 0, 2), (601, 0, 3), (590, 1, 0), (594, 1, 1), (598, 1, 2), (602, 1, 3), (591, 2, 0), (595, 2, 1), (599, 2, 2), (603, 2, 3), (592, 3, 0), (596, 3, 1), (600, 3, 2), (604, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 7, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (577, 0, 0), (579, 0, 1), (578, 1, 0), (580, 1, 1)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 8, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (585, 0, 0), (587, 0, 1), (586, 1, 0), (588, 1, 1)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 9, 'porta', '09', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 10, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (257, 0, 0), (261, 0, 1), (265, 0, 2), (269, 0, 3), (273, 0, 4), (258, 1, 0), (262, 1, 1), (266, 1, 2), (270, 1, 3), (274, 1, 4), (259, 2, 0), (263, 2, 1), (267, 2, 2), (271, 2, 3), (275, 2, 4), (260, 3, 0), (264, 3, 1), (268, 3, 2), (272, 3, 3), (276, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 11, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (277, 0, 0), (281, 0, 1), (285, 0, 2), (289, 0, 3), (293, 0, 4), (278, 1, 0), (282, 1, 1), (286, 1, 2), (290, 1, 3), (294, 1, 4), (279, 2, 0), (283, 2, 1), (287, 2, 2), (291, 2, 3), (295, 2, 4), (280, 3, 0), (284, 3, 1), (288, 3, 2), (292, 3, 3), (296, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 12, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (297, 0, 0), (299, 0, 1), (301, 0, 2), (303, 0, 3), (305, 0, 4), (298, 1, 0), (300, 1, 1), (302, 1, 2), (304, 1, 3), (306, 1, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 13, 'quadro', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 14, 'porta', '10', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 15, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (307, 0, 0), (311, 0, 1), (315, 0, 2), (319, 0, 3), (323, 0, 4), (308, 1, 0), (312, 1, 1), (316, 1, 2), (320, 1, 3), (324, 1, 4), (309, 2, 0), (313, 2, 1), (317, 2, 2), (321, 2, 3), (325, 2, 4), (310, 3, 0), (314, 3, 1), (318, 3, 2), (322, 3, 3), (326, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 16, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (327, 0, 0), (331, 0, 1), (335, 0, 2), (339, 0, 3), (343, 0, 4), (328, 1, 0), (332, 1, 1), (336, 1, 2), (340, 1, 3), (344, 1, 4), (329, 2, 0), (333, 2, 1), (337, 2, 2), (341, 2, 3), (345, 2, 4), (330, 3, 0), (334, 3, 1), (338, 3, 2), (342, 3, 3), (346, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 17, 'porta', '11', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 18, 'hidrante', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 19, 'extintor', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 20, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (347, 0, 0), (351, 0, 1), (355, 0, 2), (359, 0, 3), (348, 1, 0), (352, 1, 1), (356, 1, 2), (360, 1, 3), (349, 2, 0), (353, 2, 1), (357, 2, 2), (361, 2, 3), (350, 3, 0), (354, 3, 1), (358, 3, 2), (362, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 21, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (363, 0, 0), (367, 0, 1), (371, 0, 2), (375, 0, 3), (364, 1, 0), (368, 1, 1), (372, 1, 2), (376, 1, 3), (365, 2, 0), (369, 2, 1), (373, 2, 2), (377, 2, 3), (366, 3, 0), (370, 3, 1), (374, 3, 2), (378, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 22, 'lixeira', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 23, 'porta', '12', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 24, 'fundo', NULL, 'Salão Nobre', 'vidro', NULL, NULL) RETURNING id INTO v_item;

  -- Corredor 3
  INSERT INTO corredores (school_id, codigo, nome, nome_curto, sigla, cor, ordem, area_deitada, area_estreita)
  VALUES (v_escola, '3', 'Corredor 3', 'Corredor', '3', '#E5484D', 3, '1 / 3 / 3 / 4', '1 / 3 / 3 / 4') RETURNING id INTO v_corredor;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 1, 'portal', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 2, 'mural', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 3, 'extintor', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 4, 'porta', '13', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 5, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (379, 0, 0), (383, 0, 1), (387, 0, 2), (391, 0, 3), (395, 0, 4), (380, 1, 0), (384, 1, 1), (388, 1, 2), (392, 1, 3), (396, 1, 4), (381, 2, 0), (385, 2, 1), (389, 2, 2), (393, 2, 3), (397, 2, 4), (382, 3, 0), (386, 3, 1), (390, 3, 2), (394, 3, 3), (398, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 6, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (399, 0, 0), (401, 0, 1), (403, 0, 2), (400, 1, 0), (402, 1, 1), (404, 1, 2)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 7, 'hidrante', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 8, 'porta', '14', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 9, 'lixeira', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 10, 'porta', NULL, NULL, 'estoque', NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 11, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (569, 0, 0), (571, 0, 1), (573, 0, 2), (570, 1, 0), (572, 1, 1), (574, 1, 2)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 12, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[38, 38, 38, 38]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (405, 0, 0), (409, 0, 1), (413, 0, 2), (417, 0, 3), (406, 1, 0), (410, 1, 1), (414, 1, 2), (418, 1, 3), (407, 2, 0), (411, 2, 1), (415, 2, 2), (419, 2, 3), (408, 3, 0), (412, 3, 1), (416, 3, 2), (420, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 13, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (421, 0, 0), (425, 0, 1), (429, 0, 2), (433, 0, 3), (437, 0, 4), (422, 1, 0), (426, 1, 1), (430, 1, 2), (434, 1, 3), (438, 1, 4), (423, 2, 0), (427, 2, 1), (431, 2, 2), (435, 2, 3), (439, 2, 4), (424, 3, 0), (428, 3, 1), (432, 3, 2), (436, 3, 3), (440, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 14, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (441, 0, 0), (445, 0, 1), (449, 0, 2), (453, 0, 3), (457, 0, 4), (442, 1, 0), (446, 1, 1), (450, 1, 2), (454, 1, 3), (458, 1, 4), (443, 2, 0), (447, 2, 1), (451, 2, 2), (455, 2, 3), (459, 2, 4), (444, 3, 0), (448, 3, 1), (452, 3, 2), (456, 3, 3), (460, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 15, 'bloco', NULL, NULL, NULL, 'escuro', ARRAY[46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (461, 0, 0), (463, 0, 1), (465, 0, 2), (467, 0, 3), (462, 1, 0), (464, 1, 1), (466, 1, 2), (468, 1, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 16, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[38, 38, 38, 38]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (469, 0, 0), (473, 0, 1), (477, 0, 2), (481, 0, 3), (470, 1, 0), (474, 1, 1), (478, 1, 2), (482, 1, 3), (471, 2, 0), (475, 2, 1), (479, 2, 2), (483, 2, 3), (472, 3, 0), (476, 3, 1), (480, 3, 2), (484, 3, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 17, 'porta', '15', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 18, 'fundo', '16', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;

  -- Mecânica
  INSERT INTO corredores (school_id, codigo, nome, nome_curto, sigla, cor, ordem, area_deitada, area_estreita)
  VALUES (v_escola, 'mecanica', 'Mecânica', NULL, 'M', '#3DBE6E', 4, '1 / 1 / 4 / 2', '1 / 1 / 4 / 2') RETURNING id INTO v_corredor;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 1, 'rampa', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 2, 'extintor', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 3, 'porta', NULL, 'Ciências', 'laboratorio', NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 4, 'quadro', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 5, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (489, 0, 0), (491, 0, 1), (493, 0, 2), (495, 0, 3), (490, 1, 0), (492, 1, 1), (494, 1, 2), (496, 1, 3)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 6, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[36, 36, 44, 44]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (497, 0, 0), (499, 0, 1), (501, 0, 2), (503, 0, 3), (498, 1, 0), (500, 1, 1), (502, 1, 2), (504, 1, 3), (505, 2, 0), (507, 2, 1), (509, 2, 2), (506, 3, 0), (508, 3, 1), (510, 3, 2)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 7, 'porta', '18', NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 8, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[30, 30, 30, 30]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (513, 0, 0), (517, 0, 1), (521, 0, 2), (525, 0, 3), (529, 0, 4), (514, 1, 0), (518, 1, 1), (522, 1, 2), (526, 1, 3), (530, 1, 4), (515, 2, 0), (519, 2, 1), (523, 2, 2), (527, 2, 3), (531, 2, 4), (516, 3, 0), (520, 3, 1), (524, 3, 2), (528, 3, 3), (532, 3, 4)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 9, 'bloco', NULL, NULL, NULL, 'claro', ARRAY[34, 34, 46, 46]::smallint[]) RETURNING id INTO v_item;
  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha
    FROM (VALUES (533, 0, 0), (537, 0, 1), (541, 0, 2), (545, 0, 3), (534, 1, 0), (538, 1, 1), (542, 1, 2), (546, 1, 3), (535, 2, 0), (539, 2, 1), (543, 2, 2), (536, 3, 0), (540, 3, 1), (544, 3, 2)) AS p(numero, coluna, linha)
   WHERE l.school_id = v_escola
     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = p.numero
     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND NULLIF(regexp_replace(d.nome, '[^0-9]', '', 'g'), '')::int = p.numero);
  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)
  VALUES (v_corredor, 10, 'fim', NULL, NULL, NULL, NULL, NULL) RETURNING id INTO v_item;
END $$;

COMMIT;

-- Conferência 1: armários da escola que ficaram sem lugar na parede.
SELECT l.nome, l.corredor, l.status FROM lockers l JOIN schools s ON s.id = l.school_id
 WHERE s.codigo = 'etec-043' AND l.item_id IS NULL ORDER BY NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int NULLS LAST;

-- Conferência 2: portas da parede que não encontraram armário no banco.
SELECT e.numero FROM (VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10), (11), (12), (13), (14), (15), (16), (17), (18), (19), (20), (21), (22), (23), (24), (25), (26), (27), (28), (29), (30), (31), (32), (33), (34), (35), (36), (37), (38), (39), (40), (41), (42), (43), (44), (45), (46), (47), (48), (49), (50), (51), (52), (53), (54), (55), (56), (57), (58), (59), (60), (61), (62), (63), (64), (65), (66), (67), (68), (69), (70), (71), (72), (73), (74), (75), (76), (77), (78), (79), (80), (81), (82), (83), (84), (85), (86), (87), (88), (89), (90), (91), (92), (93), (94), (95), (96), (97), (98), (99), (100), (101), (102), (103), (104), (105), (106), (107), (108), (109), (110), (111), (112), (113), (114), (115), (116), (117), (118), (119), (120), (121), (122), (123), (124), (125), (126), (127), (128), (129), (130), (131), (132), (133), (134), (135), (136), (137), (138), (139), (140), (141), (142), (143), (144), (145), (146), (147), (148), (149), (150), (151), (152), (153), (154), (155), (156), (157), (158), (159), (160), (161), (162), (163), (164), (165), (166), (167), (168), (169), (170), (171), (172), (173), (174), (175), (176), (177), (178), (179), (180), (181), (182), (183), (184), (189), (190), (191), (192), (193), (194), (195), (196), (197), (198), (199), (200), (205), (206), (207), (208), (209), (210), (211), (212), (213), (214), (215), (216), (217), (218), (219), (220), (221), (222), (223), (224), (225), (226), (227), (228), (229), (230), (231), (232), (233), (234), (235), (236), (237), (238), (239), (240), (241), (242), (243), (244), (245), (246), (247), (248), (249), (250), (251), (252), (253), (254), (255), (256), (257), (258), (259), (260), (261), (262), (263), (264), (265), (266), (267), (268), (269), (270), (271), (272), (273), (274), (275), (276), (277), (278), (279), (280), (281), (282), (283), (284), (285), (286), (287), (288), (289), (290), (291), (292), (293), (294), (295), (296), (297), (298), (299), (300), (301), (302), (303), (304), (305), (306), (307), (308), (309), (310), (311), (312), (313), (314), (315), (316), (317), (318), (319), (320), (321), (322), (323), (324), (325), (326), (327), (328), (329), (330), (331), (332), (333), (334), (335), (336), (337), (338), (339), (340), (341), (342), (343), (344), (345), (346), (347), (348), (349), (350), (351), (352), (353), (354), (355), (356), (357), (358), (359), (360), (361), (362), (363), (364), (365), (366), (367), (368), (369), (370), (371), (372), (373), (374), (375), (376), (377), (378), (379), (380), (381), (382), (383), (384), (385), (386), (387), (388), (389), (390), (391), (392), (393), (394), (395), (396), (397), (398), (399), (400), (401), (402), (403), (404), (405), (406), (407), (408), (409), (410), (411), (412), (413), (414), (415), (416), (417), (418), (419), (420), (421), (422), (423), (424), (425), (426), (427), (428), (429), (430), (431), (432), (433), (434), (435), (436), (437), (438), (439), (440), (441), (442), (443), (444), (445), (446), (447), (448), (449), (450), (451), (452), (453), (454), (455), (456), (457), (458), (459), (460), (461), (462), (463), (464), (465), (466), (467), (468), (469), (470), (471), (472), (473), (474), (475), (476), (477), (478), (479), (480), (481), (482), (483), (484), (489), (490), (491), (492), (493), (494), (495), (496), (497), (498), (499), (500), (501), (502), (503), (504), (505), (506), (507), (508), (509), (510), (513), (514), (515), (516), (517), (518), (519), (520), (521), (522), (523), (524), (525), (526), (527), (528), (529), (530), (531), (532), (533), (534), (535), (536), (537), (538), (539), (540), (541), (542), (543), (544), (545), (546), (569), (570), (571), (572), (573), (574), (577), (578), (579), (580), (585), (586), (587), (588), (589), (590), (591), (592), (593), (594), (595), (596), (597), (598), (599), (600), (601), (602), (603), (604)) AS e(numero)
 WHERE NOT EXISTS (SELECT 1 FROM lockers l JOIN schools s ON s.id = l.school_id
                    WHERE s.codigo = 'etec-043' AND l.item_id IS NOT NULL AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = e.numero)
 ORDER BY e.numero;

-- Conferência 3: números repetidos na escola (não foram ligados).
SELECT NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int AS numero, count(*) FROM lockers l JOIN schools s ON s.id = l.school_id
 WHERE s.codigo = 'etec-043' GROUP BY 1 HAVING count(*) > 1 ORDER BY 1;
