import { useParams } from 'react-router-dom';
import { slugDoHostname } from './tenant.js';
import { useEscola } from '../theme/contextoEscola.js';

// Endereço e identidade da escola são coisas diferentes, e confundi-las custou
// uma migração inteira.
//
//   ENDEREÇO   'etec-bentoquirino'  o que o aluno digita no navegador
//   IDENTIDADE 'etec-043'           o que o sistema usa em todo lugar
//
// Até 2026-08-22 eram o mesmo campo. Por isso deixar o endereço apresentável
// exigiu renomear a escola, e a renomeação arrastou tudo que apontava para o
// código antigo — inclusive a URL de webhook registrada no gateway, que carrega
// o código no caminho e passou a não casar mais.
//
// Separados, trocar o endereço vira uma operação inofensiva.

/**
 * O endereço pelo qual esta requisição chegou.
 *
 * Serve para UMA coisa: resolver qual escola é. Só o EscolaProvider usa.
 * Qualquer outra tela que precise do código deve usar `useCodigoEscola`, senão
 * volta a mandar o endereço para a API.
 *
 * O hostname tem precedência sobre a rota: num endereço próprio da instituição,
 * um `/:schoolCode` divergente na URL não pode fazer o portal de uma escola
 * servir dados de outra.
 */
export const useEnderecoDaEscola = () => {
    const { schoolCode } = useParams();
    return slugDoHostname() ?? schoolCode;
};

/**
 * O código canônico da instituição — o que login, armários, usuários e
 * pagamentos usam.
 *
 * Vem da escola já resolvida. Enquanto ela não chega, devolve o endereço: é a
 * melhor aproximação disponível, e nas instalações em que endereço e código são
 * o mesmo (toda escola sem subdomínio próprio) os dois valores coincidem.
 *
 * Também serve para montar URL. No subdomínio o `rotaEscola` ignora o código; no
 * modo caminho, o segmento da URL É o código — então o canônico é o certo nos
 * dois casos.
 */
export const useCodigoEscola = () => {
    const { escola } = useEscola();
    const endereco = useEnderecoDaEscola();
    return escola?.codigo ?? endereco;
};
