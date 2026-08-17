import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { escolaService } from '../services/escolaService';
import { EscolaContext } from './contextoEscola.js';

// Contexto que carrega a escola da URL uma única vez e a compartilha com todas as
// telas (login, home, admin, checkout...). Antes, cada tela fazia seu próprio fetch.
//
// Não há tema por escola: a estilização do sistema é fixa na marca LCKP
// (ver theme/marca.js e os tokens de :root em index.css). O que a instituição
// personaliza é a(s) logo(s) e onde elas aparecem.
// O contexto e o hook `useEscola` vivem em ./contextoEscola.js — ver o
// motivo la (Fast Refresh).

export function EscolaProvider({ children }) {
  const { schoolCode } = useParams();
  const [escola, setEscola] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!schoolCode) {
      setErro(true);
      setCarregando(false);
      return;
    }
    try {
      setCarregando(true);
      setErro(false);
      const dados = await escolaService.buscarPorCodigo(schoolCode);
      setEscola(dados);
    } catch (err) {
      console.error('Falha ao carregar a identidade da instituição:', err);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    const buscar = async () => { await carregar(); };
    buscar();
  }, [carregar]);

  // Atualiza a escola em memória (ex.: após salvar a personalização, a logo nova
  // aparece na navbar sem precisar recarregar a página).
  const atualizarEscolaLocal = useCallback((novosDados) => {
    setEscola((anterior) => ({ ...anterior, ...novosDados }));
  }, []);

  return (
    <EscolaContext.Provider value={{ escola, carregando, erro, recarregar: carregar, atualizarEscolaLocal }}>
      {children}
    </EscolaContext.Provider>
  );
}

// Elemento de rota: provê o contexto para tudo que estiver sob /:schoolCode.
export function EscolaLayout() {
  return (
    <EscolaProvider>
      <Outlet />
    </EscolaProvider>
  );
}
