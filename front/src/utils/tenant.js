// Resolução da instituição pelo endereço.
//
// O sistema atende várias escolas com UM único deploy. Quem decide de qual
// escola é a requisição é o HOSTNAME, não a URL nem nada que o cliente envie:
//
//   etec-bentoquirino.lckp.com.br  ->  a escola vem do subdomínio, e as telas
//                                      dela ficam na raiz do site
//   lckp.com.br/etec-bentoquirino  ->  modo antigo, ainda funciona
//
// Enquanto as duas formas coexistirem, o mesmo código serve as duas: o único
// lugar que sabe a diferença é este arquivo.

const BASE = (import.meta.env.VITE_DOMINIO_BASE || 'lckp.com.br').toLowerCase();

// Subdomínios que a plataforma usa e que nenhuma escola pode registrar. Uma
// escola que ficasse com 'api' derrubaria o backend; com 'www', a landing.
const RESERVADOS = new Set([
    'www', 'api', 'admin', 'app', 'painel', 'docs', 'status',
    'mail', 'staging', 'dev', 'test', 'cdn', 'assets', 'auth', 'webhook'
]);

// O certificado curinga (*.lckp.com.br) cobre UM nível só: 'a.lckp.com.br'
// vale, 'a.b.lckp.com.br' falha na validação TLS antes de chegar ao servidor.
const FORMATO_SLUG = /^[a-z0-9-]{3,40}$/;

/**
 * Código da escola contido no endereço, ou null quando não há.
 *
 * Devolve null no ápice (lckp.com.br), em localhost e em subdomínio reservado
 * — nesses casos quem manda é a rota /:schoolCode.
 */
export const slugDoHostname = (hostname) => {
    const host = String(hostname ?? window.location.hostname).toLowerCase();

    // Domínio próprio da escola (armarios.escola.com.br) ainda não é resolvido
    // aqui: exigirá consulta ao banco por hostname, não dá para deduzir.
    if (!host.endsWith('.' + BASE)) return null;

    const sub = host.slice(0, -(BASE.length + 1));
    if (!sub || sub.includes('.')) return null;
    if (RESERVADOS.has(sub)) return null;
    if (!FORMATO_SLUG.test(sub)) return null;
    if (sub.startsWith('-') || sub.endsWith('-')) return null;

    return sub;
};

/** Verdadeiro quando o portal está sendo servido no subdomínio de uma escola. */
export const ehSubdominioDeEscola = () => slugDoHostname() !== null;

/**
 * Caminho de uma tela da escola.
 *
 * No subdomínio as telas ficam na raiz; no modo antigo, sob /:schoolCode.
 * Toda navegação passa por aqui — montar a URL à mão em qualquer tela faria
 * aquela tela funcionar num modo e quebrar no outro, e o erro só apareceria
 * na escola que estivesse no outro endereço.
 *
 * @param {string} schoolCode  código da escola (ignorado no subdomínio)
 * @param {string} [tela]      'home', 'meu-armario', 'checkout'... vazio = raiz
 */
export const rotaEscola = (schoolCode, tela = '') => {
    const limpa = String(tela || '').replace(/^\/+/, '');
    if (ehSubdominioDeEscola()) return '/' + limpa;
    return '/' + schoolCode + (limpa ? '/' + limpa : '');
};
