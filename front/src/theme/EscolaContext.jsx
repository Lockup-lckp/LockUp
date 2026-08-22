import { useCodigoEscola } from '../utils/useCodigoEscola.js';
import { ehSubdominioDeEscola } from '../utils/tenant.js';
import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { escolaService } from '../services/escolaService';
import { EscolaContext, useEscola } from './contextoEscola.js';
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
  // Hostname primeiro, rota depois — a regra vive em useCodigoEscola.
  const schoolCode = useCodigoEscola();
  const navegar = useNavigate();
  const local = useLocation();
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

      // Chegou pelo código ANTIGO: leva para o endereço atual.
      //
      // O backend encontra a escola pelos dois códigos (schools.codigo_anterior),
      // então a tela já funcionaria aqui mesmo. Mas deixar o aluno num endereço
      // aposentado faz ele continuar compartilhando o link morto, e o dia em que
      // a rede de segurança sair leva todo mundo junto. `replace` para o botão
      // voltar não devolver ao endereço velho.
      //
      // NO SUBDOMÍNIO não redirecionamos, de propósito: corrigir o host é
      // trocar de origem, e sessionStorage não atravessa origem — o aluno seria
      // deslogado no meio do caminho. Lá o código antigo simplesmente continua
      // funcionando pela busca em `codigo_anterior`.
      if (dados?.codigo && dados.codigo !== schoolCode && !ehSubdominioDeEscola()) {
        const resto = local.pathname.split('/').slice(2).join('/');
        navegar('/' + dados.codigo + (resto ? '/' + resto : '') + local.search, { replace: true });
      }
    } catch (err) {
      console.error('Falha ao carregar a identidade da instituição:', err);
      setErro(true);
    } finally {
      setCarregando(false);
    }
    // `local` de propósito fora das dependências: ele muda a cada navegação
    // e recarregaria a escola em toda troca de tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, navegar]);

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
      <PortaDaEscola />
    </EscolaProvider>
  );
}

/**
 * Decide entre abrir o portal e dizer que a escola não existe.
 *
 * Antes o layout renderizava o <Outlet /> direto, sem olhar o erro: com um
 * código inválido a tela filha era montada com `escola` nulo e o aluno via uma
 * página que carregava e não mostrava nada — sem mensagem, sem caminho de
 * volta. É o "não vai a lugar nenhum" de quem digita o código errado.
 *
 * O carregamento continua passando reto para as telas: cada uma já tem o
 * próprio estado de espera, e prendê-las aqui mudaria o comportamento de todas.
 */
function PortaDaEscola() {
  const { erro } = useEscola();
  if (erro) return <EscolaNaoEncontrada />;
  return <Outlet />;
}

function EscolaNaoEncontrada() {
  const codigo = useCodigoEscola();

  // Marca LCKP, não a da escola: não há escola para ter identidade aqui.
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A1F44] text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0D2A52] p-7 text-center shadow-2xl">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-extrabold"
          style={{ background: 'rgba(232,180,74,0.14)', color: '#E8B44A' }}
        >
          ?
        </div>

        <h1 className="text-xl font-extrabold">Não encontramos esta instituição</h1>

        {codigo && (
          <p className="mt-2 text-sm text-white/60">
            Nenhuma escola usa o código{' '}
            <strong className="font-mono text-white/85">{codigo}</strong>.
          </p>
        )}

        <p className="mt-3 text-sm text-white/60">
          Confira com a secretaria da sua escola. O código costuma aparecer no
          endereço que a instituição divulga.
        </p>

        <a
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-5 font-bold text-[#0A1F44] transition-[filter] hover:brightness-110"
          style={{ background: 'linear-gradient(180deg,#E8B44A,#C8912E)' }}
        >
          Procurar minha escola
        </a>
      </div>
    </div>
  );
}
