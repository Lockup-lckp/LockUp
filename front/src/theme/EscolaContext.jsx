import { slugDoHostname } from '../utils/tenant.js';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { escolaService } from '../services/escolaService';
import { EscolaContext } from './contextoEscola.js';
import { aplicarTema, aplicarIdentidade, limparTema } from './aplicarTema.js';

// Contexto que carrega a escola da URL uma única vez e a compartilha com todas as
// telas (login, home, admin, checkout...). Antes, cada tela fazia seu próprio fetch.
//
// A escola é resolvida pelo HOSTNAME quando o portal está num subdomínio
// (etec-bentoquirino.lckp.com.br) e pela rota /:schoolCode caso contrário. O
// hostname tem precedência: é o único identificador que o cliente não escolhe.
//
// Ao carregar a escola, sua identidade visual é escrita nos tokens de :root —
// cores, título da aba e favicon. Antes a estilização era fixa na marca LCKP;
// agora a marca da plataforma cede o primeiro plano à instituição.
// O contexto e o hook `useEscola` vivem em ./contextoEscola.js — ver o
// motivo la (Fast Refresh).

export function EscolaProvider({ children }) {
  const { schoolCode: codigoDaRota } = useParams();
  // Subdomínio vence a rota: num endereço próprio da escola, um /:schoolCode
  // divergente na URL não pode fazer o portal de uma instituição servir dados
  // de outra.
  const schoolCode = slugDoHostname() ?? codigoDaRota;
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
      aplicarTema(dados);
      aplicarIdentidade(dados);
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
    // Desfaz o tema ao sair do portal da escola. Sem isto a landing herdaria
    // as cores da última instituição visitada na mesma sessão — o tema é
    // escrito inline em documentElement e sobrevive à troca de rota.
    return () => limparTema();
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
