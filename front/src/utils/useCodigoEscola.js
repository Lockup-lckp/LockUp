import { useParams } from 'react-router-dom';
import { slugDoHostname } from './tenant.js';

/**
 * Código da instituição da requisição atual.
 *
 * Existe porque `useParams().schoolCode` é **undefined no subdomínio**: lá a
 * rota é `/`, sem `/:schoolCode` nenhum para casar. Ler o parâmetro cru
 * funcionava no modo antigo (lckp.com.br/etec-bentoquirino) e falhava em
 * etec-bentoquirino.lckp.com.br — e falhava tarde, dentro da chamada à API.
 *
 * O sintoma foi esse: no portal por subdomínio, o login respondia "O código da
 * escola é obrigatório para realizar o login" numa tela que já mostrava a logo
 * e o nome da escola. A identidade vinha do EscolaContext, que já resolvia pelo
 * hostname; a chamada de autenticação vinha do useParams, que não.
 *
 * Toda tela que precise do código usa este hook. Ler `useParams()` direto
 * volta a quebrar só no subdomínio, que é justamente onde a escola de verdade
 * está — e o modo antigo continuaria passando nos testes.
 *
 * O hostname tem precedência sobre a rota de propósito: num endereço próprio da
 * instituição, um `/:schoolCode` divergente na URL não pode fazer o portal de
 * uma escola servir dados de outra.
 */
export const useCodigoEscola = () => {
    const { schoolCode } = useParams();
    return slugDoHostname() ?? schoolCode;
};
