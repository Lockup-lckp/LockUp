import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { checkoutService } from '../../services/checkoutServices';
import { validarCPF, aplicarMascaraCPF } from '../../utils/validadorCpf';
import { useEscola } from '../../theme/EscolaContext.jsx';
import { API_BASE } from '../../services/api';
import ModalTermos from '../../components/TermosDeUso.jsx';
import { nomearCorredor, rotuloCorredor } from '../../utils/rotuloCorredor';
import './Checkout.css';

// Chave pública do Mercado Pago — NUNCA a Access Token/Secret aqui, só a Public Key.
//
// Sem fallback de propósito: antes havia uma chave de teste embutida, e esquecer
// a variável no ambiente de build não quebrava nada — o site tokenizava com a
// conta errada e a cobrança só falhava no fim, com erro incompreensível para o
// aluno. Ausente, é melhor avisar na hora.
const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;

// Ícones simples e genéricos (sem depender de nenhuma lib externa)
const PixIcon = () => (
  <svg className="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" />
    <path d="M7.5 7.5l2.6 2.6a2.7 2.7 0 0 0 3.8 0l2.6-2.6M16.5 16.5l-2.6-2.6a2.7 2.7 0 0 0-3.8 0l-2.6 2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CardIcon = () => (
  <svg className="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
    <path d="M2.5 9.5h19" strokeLinecap="round" />
    <path d="M6 14.5h4" strokeLinecap="round" />
  </svg>
);

const Spinner = ({ large }) => <span className={`spinner${large ? ' large' : ''}`} aria-hidden="true" />;

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolCode } = useParams();
  const { escola } = useEscola();

  const m_armario = location.state?.armario || { nome: 'N/A', corredor: 'N/A' };
  // Valor vem do state da navegação, com fallback para o valor configurado da escola.
  const valorArmario = location.state?.valorArmario ?? escola?.valor_armario ?? 0;

  // Prazo da locação: o ciclo letivo, não um mês. Mesmas datas que o backend
  // usa em `dentroDaJanelaDeVendas` e que os termos de uso descrevem.
  const encerramento = `${String(escola?.encerramento_dia ?? 20).padStart(2, '0')}/${String(escola?.encerramento_mes ?? 12).padStart(2, '0')}`;
  // Mesma regra de `anoLetivoAtual` no pagamentosControlador: antes da data de
  // abertura ainda estamos no ciclo do ano anterior. Um `getFullYear()` simples
  // mostraria ao aluno um ano diferente do que fica gravado em rentals.
  const anoLetivo = (() => {
    const hoje = new Date();
    const abertura = (escola?.abertura_mes ?? 2) * 100 + (escola?.abertura_dia ?? 1);
    const atual = (hoje.getMonth() + 1) * 100 + hoje.getDate();
    return atual < abertura ? hoje.getFullYear() - 1 : hoje.getFullYear();
  })();

  // Estados do Formulário Comum
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix'); // 'pix' ou 'cartao'

  // Aceite dos termos de uso. Trava o envio até ser marcado — o aluno precisa
  // ter tido a chance de ler as regras da locação antes de pagar.
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [termosAbertos, setTermosAbertos] = useState(false);

  // Compra aprovada: o aluno precisa VER a confirmacao antes de sair da tela.
  // Antes era uma frase que sumia junto com o redirecionamento automatico.
  const [aprovado, setAprovado] = useState(false);

  // Modalidade da locação, conforme o contrato da escola.
  const [modalidade, setModalidade] = useState('anual');
  const ofereceSemestral = Boolean(escola?.permite_semestral) && Number(escola?.valor_armario_semestral) > 0;
  const encerramentoSemestral = `${String(escola?.encerramento_semestral_dia ?? 6).padStart(2, '0')}/${String(escola?.encerramento_semestral_mes ?? 7).padStart(2, '0')}`;

  // Preço exibido segue a modalidade. É só apresentação: quem cobra de verdade
  // é o backend, a partir da configuração da escola.
  const valorDaModalidade = modalidade === 'semestral'
    ? Number(escola?.valor_armario_semestral ?? 0)
    : Number(valorArmario);
  const validoAte = modalidade === 'semestral' ? encerramentoSemestral : encerramento;

  // Estados do Cartão de Crédito
  const [nomeCartao, setNomeCartao] = useState('');
  const [numeroCartao, setNumeroCartao] = useState('');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');
  const [emailCartao, setEmailCartao] = useState('');

  // Qual gateway a escola usa. Decide qual SDK carregar e como cifrar o cartão.
  const [configPagamento, setConfigPagamento] = useState({ gateway: 'mercadopago' });

  useEffect(() => {
    let cancelado = false;

    const carregarScript = (src, jaCarregado) => {
      if (jaCarregado()) return;
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    };

    (async () => {
      let config = { gateway: 'mercadopago' };
      try {
        const token = sessionStorage.getItem('token') || '';
        const resposta = await fetch(`${API_BASE}/pagamentos/config/${schoolCode}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (resposta.ok) config = await resposta.json();
      } catch {
        // Sem config, segue no Mercado Pago — o backend valida de qualquer forma.
      }
      if (cancelado) return;

      setConfigPagamento(config);

      if (config.gateway === 'pagbank') {
        carregarScript(
          'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js',
          () => window.PagSeguro
        );
      } else {
        carregarScript('https://sdk.mercadopago.com/js/v2', () => window.MercadoPago);
      }
    })();

    return () => { cancelado = true; };
  }, [schoolCode]);

  // Estados de Controle do Fluxo de Telas
  const [passo, setPasso] = useState(1);
  // imagemUrl atende o PagBank, que devolve o QR como link para um PNG;
  // imagemBase64 atende o Mercado Pago, que embute a imagem na resposta.
  // imagemLocal atende o Banco do Brasil, que devolve SÓ o texto do BRCode
  // (pixCopiaECola) — sem ela o aluno ficaria olhando um spinner para sempre,
  // com a cobrança criada e nenhum QR na tela.
  const [qrCodeData, setQrCodeData] = useState({ copiaECola: '', imagemBase64: '', imagemUrl: '' });
  const [imagemLocal, setImagemLocal] = useState({ para: '', url: '' });

  // O Banco do Brasil só recebe Pix: cartão por lá exigiria TEF com pinpad no
  // totem. Oferecer a opção deixaria o aluno preencher o cartão inteiro para
  // levar um erro no fim.
  const aceitaCartao = configPagamento.gateway !== 'bancodobrasil';
  const [transactionId, setTransactionId] = useState('');
  const [statusMensagem, setStatusMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const processandoRef = useRef(false); // Trava síncrona contra duplo-clique/duplo-submit

  // Desenha o QR quando o gateway manda só o texto do BRCode (caso do Banco do
  // Brasil). O import é dinâmico para a biblioteca não entrar no pacote de quem
  // paga por outro gateway — ela só é baixada quando faz falta.
  useEffect(() => {
    if (!qrCodeData.copiaECola || qrCodeData.imagemBase64 || qrCodeData.imagemUrl) return;

    let cancelado = false;
    (async () => {
      try {
        // A qrcode é CommonJS: no navegador o Vite entrega tudo sob `default`,
        // e um `const { toDataURL } = await import(...)` sai undefined — o QR
        // nunca aparecia e o aluno ficava no spinner. Aceita as duas formas.
        const mod = await import('qrcode');
        const toDataURL = mod.default?.toDataURL || mod.toDataURL;
        const url = await toDataURL(qrCodeData.copiaECola, { margin: 1, width: 280 });
        // Guarda junto o código que gerou a imagem. É o que dispensa limpar o
        // estado quando o Pix muda: a imagem antiga simplesmente deixa de casar
        // com o código atual, sem um setState a mais no corpo do efeito.
        if (!cancelado) setImagemLocal({ para: qrCodeData.copiaECola, url });
      } catch (err) {
        // O "copia e cola" continua na tela e resolve o pagamento sozinho.
        console.error('Não foi possível desenhar o QR:', err);
      }
    })();

    return () => { cancelado = true; };
  }, [qrCodeData.copiaECola, qrCodeData.imagemBase64, qrCodeData.imagemUrl]);

  // Só vale se foi desenhada a partir do código que está na tela agora.
  const qrDesenhadoLocal =
    imagemLocal.para && imagemLocal.para === qrCodeData.copiaECola ? imagemLocal.url : '';

  // Polling automático para escutar a aprovação do pagamento via Webhook/Backend
  useEffect(() => {
    let interval;
    if (passo === 2 && transactionId) {
      interval = setInterval(async () => {
        try {
          const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');
          const token = usuarioLogado.token || sessionStorage.getItem('token') || '';

          const response = await fetch(`${API_BASE}/pagamentos/status/${transactionId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const resultado = await response.json();
            if (resultado.status_pagamento === 'aprovado') {
              clearInterval(interval);
              // Não redireciona sozinho: o aluno precisa VER a confirmação e
              // anotar o número do armário. Antes a frase sumia junto com a
              // troca de tela, em 2,5 segundos.
              setAprovado(true);
              setStatusMensagem('');
            }
          }
        } catch (err) {
          console.error('Erro ao verificar status do pagamento:', err);
        }
      }, 2000); // Checa a cada 2 segundos.
      // Era 4s. O aluno fica olhando a tela esperando o "aprovado" aparecer, e
      // metade do intervalo é metade da espera percebida. A consulta é uma
      // leitura barata por transação, e o webhook do banco continua sendo quem
      // realmente confirma — isto aqui só encurta o tempo até a tela reagir.
    }
    return () => clearInterval(interval);
  }, [passo, transactionId, navigate, schoolCode]);

  const handleCPFChange = (e) => {
    const valorMascarado = aplicarMascaraCPF(e.target.value);
    setCpf(valorMascarado);
  };

  // Cartão: só dígitos, agrupados de 4 em 4. Sem isso o campo aceitava letras e
  // texto de qualquer tamanho, e o erro só aparecia lá na frente, na cobrança.
  const handleNumeroCartaoChange = (e) => {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 16);
    setNumeroCartao(digitos.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  // Validade MM/AA: a barra entra sozinha depois do mês.
  const handleValidadeChange = (e) => {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 4);
    setValidade(digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos);
  };

  // Telefone: (19) 99999-9999
  const handleTelefoneChange = (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    let saida = d;
    if (d.length > 2) saida = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) saida = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    setTelefone(saida);
  };

  const handleFinalizarPagamento = async (e) => {
    e.preventDefault();

    // Trava síncrona: impede duplo clique/duplo submit de gerar 2 tokens de cartão
    if (processandoRef.current) return;
    processandoRef.current = true;

    setErro('');
    setCarregando(true);

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!validarCPF(cpfLimpo)) {
      setErro('Por favor, insira um CPF válido.');
      setCarregando(false);
      processandoRef.current = false;
      return;
    }

    try {
      if (formaPagamento === 'pix') {
        setPasso(2); // Muda para a tela de processamento/QR Code

        const dadosCliente = { nome, cpf: cpfLimpo, telefone, modalidade, formaPagamento: 'pix' };

        // Passa um objeto vazio para o mpData exigido pelo service para evitar que quebre a estrutura da rota
        const resultado = await checkoutService.iniciarCheckout(m_armario.id, dadosCliente, {});

        if (resultado.transaction_id) {
          setTransactionId(resultado.transaction_id);
          setQrCodeData({
            copiaECola: resultado.qr_code || '',
            imagemBase64: resultado.qr_code_base64 || '',
            imagemUrl: resultado.qr_code_imagem_url || ''
          });
        } else {
          throw new Error('A resposta do servidor não continha os dados do Pix.');
        }
      } else {
        // Fluxo de Cartão de Crédito: gera o token com o SDK do MP (dados sensíveis nunca vão pro nosso backend)
        if (!emailCartao || !numeroCartao || !validade || !cvv || !nomeCartao) {
          throw new Error('Preencha todos os campos do cartão para continuar.');
        }

        // PagBank: o SDK cifra o cartão no navegador com a chave pública da
        // conta da escola. Nem nós nem o backend vemos número ou CVV.
        if (configPagamento.gateway === 'pagbank') {
          if (!window.PagSeguro) {
            throw new Error('O SDK de pagamento ainda está carregando. Aguarde alguns segundos e tente novamente.');
          }
          if (!configPagamento.chave_publica) {
            throw new Error('A chave de pagamento desta instituição não está configurada. Fale com a secretaria.');
          }

          const [mesVal, anoValCurto] = validade.split('/');
          const cifrado = window.PagSeguro.encryptCard({
            publicKey: configPagamento.chave_publica,
            holder: nomeCartao,
            number: numeroCartao.replace(/\s/g, ''),
            expMonth: mesVal,
            expYear: anoValCurto?.length === 2 ? `20${anoValCurto}` : anoValCurto,
            securityCode: cvv
          });

          if (cifrado?.hasErrors || !cifrado?.encryptedCard) {
            throw new Error('Não foi possível validar os dados do cartão. Confira as informações e tente novamente.');
          }

          const resultadoPb = await checkoutService.iniciarCheckout(
            m_armario.id,
            { nome, cpf: cpfLimpo, telefone, formaPagamento: 'cartao' },
            {
              formaPagamento: 'cartao',
              cartaoCriptografado: cifrado.encryptedCard,
              installments: 1,
              payer: { email: emailCartao }
            }
          );

          if (resultadoPb.status_pagamento === 'aprovado') {
            setTransactionId(resultadoPb.transaction_id || '');
            setAprovado(true);
            setStatusMensagem('');
            setPasso(2);

          } else if (resultadoPb.status_pagamento === 'pendente') {
            setTransactionId(resultadoPb.transaction_id || '');
            setStatusMensagem('Pagamento em análise...');
            setPasso(2);
          } else {
            throw new Error('Pagamento recusado pela operadora do cartão. Verifique os dados e tente novamente.');
          }
          return;
        }

        if (!MP_PUBLIC_KEY) {
          throw new Error('A chave de pagamento não está configurada neste ambiente. Avise a secretaria da escola.');
        }

        if (!window.MercadoPago) {
          throw new Error('O SDK de pagamento ainda está carregando. Aguarde alguns segundos e tente novamente.');
        }

        const mp = new window.MercadoPago(MP_PUBLIC_KEY);

        const numeroLimpo = numeroCartao.replace(/\s/g, '');
        const [mesValidade, anoValidadeCurto] = validade.split('/');
        const anoValidade = anoValidadeCurto?.length === 2 ? `20${anoValidadeCurto}` : anoValidadeCurto;

        // Descobre a bandeira/issuer do cartão a partir do BIN (6 primeiros dígitos)
        const bin = numeroLimpo.slice(0, 6);
        const metodosPagamento = await mp.getPaymentMethods({ bin });
        const metodo = metodosPagamento?.results?.[0];

        if (!metodo) {
          throw new Error('Não foi possível identificar a bandeira do cartão. Confira o número digitado.');
        }

        // Gera o token seguro do cartão (isso é o único dado do cartão que trafega pro nosso backend)
        const cardToken = await mp.createCardToken({
          cardNumber: numeroLimpo,
          cardholderName: nomeCartao,
          cardExpirationMonth: mesValidade,
          cardExpirationYear: anoValidade,
          securityCode: cvv,
          identificationType: 'CPF',
          identificationNumber: cpfLimpo
        });

        if (!cardToken?.id) {
          throw new Error('Não foi possível validar os dados do cartão. Confira as informações e tente novamente.');
        }

        const dadosCliente = { nome, cpf: cpfLimpo, telefone, modalidade, formaPagamento: 'cartao' };

        const mpData = {
          token: cardToken.id,
          installments: 1, // TODO: adicionar seletor de parcelas usando mp.getInstallments({ bin, amount: valorArmario })
          payment_method_id: metodo.id,
          issuer_id: metodo.issuer?.id,
          payer: { email: emailCartao }
        };

        const resultado = await checkoutService.iniciarCheckout(m_armario.id, dadosCliente, mpData);

        if (resultado.status_pagamento === 'aprovado') {
          setTransactionId(resultado.transaction_id || '');
          setStatusMensagem('🎉 Pagamento aprovado! Seu armário foi liberado.');
          setPasso(2);
          // 1200ms em vez de 2500: dá para ler "pagamento aprovado" sem deixar
          // o aluno parado diante de uma tela que já cumpriu o seu papel.
          setTimeout(() => navigate(`/${schoolCode}/home`), 1200);
        } else if (resultado.status_pagamento === 'pendente') {
          setTransactionId(resultado.transaction_id || '');
          setStatusMensagem('Pagamento em análise...');
          setPasso(2);
        } else {
          throw new Error('Pagamento recusado pela operadora do cartão. Verifique os dados e tente novamente.');
        }
      }
    } catch (err) {
      setErro(err.message || 'Falha ao processar a cobrança.');
      setPasso(1);
    } finally {
      setCarregando(false);
      processandoRef.current = false;
    }
  };

  const copiarPixCopiaECola = () => {
    if (qrCodeData.copiaECola) {
      navigator.clipboard.writeText(qrCodeData.copiaECola);
      alert('Código Copia e Cola copiado com sucesso!');
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <button onClick={() => navigate(-1)} className="btn-back">← Voltar</button>
        <h1 className="checkout-title">Checkout</h1>
        <p className="checkout-subtitle">Finalize o aluguel do seu armário</p>

        <ol className="stepper">
          <li className={passo === 2 ? 'is-done' : 'is-active'}>
            <span>{passo === 2 ? '✓' : '1'}</span> Pagamento
          </li>
          <li className={passo === 2 ? 'is-active' : ''}>
            <span>2</span> Confirmação
          </li>
        </ol>
      </div>

      {erro && <div className="error-banner">⚠️ {erro}</div>}

      <div className="checkout-grid">
        {passo === 1 ? (
          <div className="form-layout">
            {/* Seção Forma de Pagamento */}
            {/* Modalidade só aparece quando a escola oferece as duas. Mostrar
                um seletor de opção única seria pedir uma decisão que não existe. */}
            {ofereceSemestral && (
              <div className="card-section">
                <h3 className="section-title">Período da locação</h3>
                <div className="payment-options">
                  <label className={`payment-card ${modalidade === 'anual' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="modalidade"
                      value="anual"
                      checked={modalidade === 'anual'}
                      onChange={() => setModalidade('anual')}
                    />
                    <div>
                      <span className="option-title">Anual</span>
                      <span className="option-subtitle">Até {encerramento}</span>
                    </div>
                  </label>

                  <label className={`payment-card ${modalidade === 'semestral' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="modalidade"
                      value="semestral"
                      checked={modalidade === 'semestral'}
                      onChange={() => setModalidade('semestral')}
                    />
                    <div>
                      <span className="option-title">Semestral</span>
                      <span className="option-subtitle">Até {encerramentoSemestral}</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="card-section">
              <h3 className="section-title">Forma de pagamento</h3>
              <div className="payment-options">
                <label className={`payment-card${formaPagamento === 'pix' ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="formaPagamento"
                    value="pix"
                    checked={formaPagamento === 'pix'}
                    onChange={() => setFormaPagamento('pix')}
                  />
                  <PixIcon />
                  <div>
                    <span className="option-title">Pix</span>
                    <span className="option-subtitle">Aprovação instantânea</span>
                  </div>
                </label>

                {aceitaCartao && (
                  <label className={`payment-card${formaPagamento === 'cartao' ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="formaPagamento"
                      value="cartao"
                      checked={formaPagamento === 'cartao'}
                      onChange={() => setFormaPagamento('cartao')}
                    />
                    <CardIcon />
                    <div>
                      <span className="option-title">Cartão de crédito</span>
                      <span className="option-subtitle">Em até 12x</span>
                    </div>
                  </label>
                )}
              </div>
              {!aceitaCartao && (
                <p className="payment-note">
                  Esta instituição recebe apenas por Pix.
                </p>
              )}
            </div>

            {/* Seção Dados do Comprador */}
            <form onSubmit={handleFinalizarPagamento} className="card-section">
              <h3 className="section-title">Dados do comprador</h3>

              <div className="fields-stack">
                <div className="input-group">
                  <label className="input-label">Nome completo</label>
                  <input
                    type="text"
                    required
                    maxLength="80"
                    placeholder="Ex: João da Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="input-element"
                  />
                </div>

                <div className="form-grid-half">
                  <div className="input-group">
                    <label className="input-label">CPF do titular</label>
                    <input
                      type="text"
                      required
                      maxLength="14"
                      placeholder="123.456.789-09"
                      value={cpf}
                      onChange={handleCPFChange}
                      className="input-element"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Telefone / WhatsApp</label>
                    <input
                      type="tel"
                      required
                      maxLength="15"
                      inputMode="numeric"
                      placeholder="(19) 99999-9999"
                      value={telefone}
                      onChange={handleTelefoneChange}
                      className="input-element"
                    />
                  </div>
                </div>

                {/* Renderização condicional dos campos exclusivos de Cartão */}
                {formaPagamento === 'cartao' && (
                  <div className="card-fields">
                    <h3 className="section-title" style={{ margin: 0 }}>Informações do cartão</h3>

                    <div className="input-group">
                      <label className="input-label">Número do cartão</label>
                      <input
                        type="text"
                        maxLength="19"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="0000 0000 0000 0000"
                        value={numeroCartao}
                        onChange={handleNumeroCartaoChange}
                        className="input-element"
                      />
                    </div>

                    <div className="form-grid-half">
                      <div className="input-group">
                        <label className="input-label">Validade (MM/AA)</label>
                        <input
                          type="text"
                          maxLength="5"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="11/30"
                          value={validade}
                          onChange={handleValidadeChange}
                          className="input-element"
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">CVV</label>
                        <input
                          type="text"
                          maxLength="4"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          placeholder="123"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          className="input-element"
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Nome impresso no cartão</label>
                      <input
                        type="text"
                        maxLength="26"
                        autoComplete="cc-name"
                        placeholder="Como está impresso no cartão"
                        value={nomeCartao}
                        onChange={(e) => setNomeCartao(e.target.value)}
                        className="input-element"
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">E-mail do titular</label>
                      <input
                        type="email"
                        maxLength="100"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        value={emailCartao}
                        onChange={(e) => setEmailCartao(e.target.value)}
                        className="input-element"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Aceite dos termos. O `required` do input já barra o submit no
                  navegador; o `disabled` do botão deixa o motivo visível em vez
                  de o aluno clicar e nada acontecer. */}
              <div className="termos-aceite">
                <label className="termos-aceite__label">
                  <input
                    type="checkbox"
                    required
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                    className="termos-aceite__check"
                  />
                  <span>
                    Li e aceito os{' '}
                    <button
                      type="button"
                      onClick={() => setTermosAbertos(true)}
                      className="termos-aceite__link"
                    >
                      termos de uso da locação
                    </button>.
                  </span>
                </label>
              </div>

              <button type="submit" disabled={carregando || !aceitouTermos} className="btn-submit">
                {carregando ? (
                  <><Spinner /> Processando...</>
                ) : formaPagamento === 'pix' ? (
                  '🚀 Gerar QR Code Pix'
                ) : (
                  '🔒 Confirmar pagamento'
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Passo 2: Tela Dinâmica de Pagamento e Renderização de QR Code */
          <div className="form-layout">
            <div className="card-section qr-card">
              {qrCodeData.imagemBase64 || qrCodeData.imagemUrl || qrDesenhadoLocal ? (
                <div>
                  <h2 style={{ color: 'var(--brass-400)', fontFamily: 'var(--font-display)', margin: '0 0 8px' }}>
                    Pague com Pix
                  </h2>
                  <p style={{ color: 'var(--paper-400)', margin: 0, fontSize: '14px' }}>
                    Abra o aplicativo do seu banco e escaneie o código abaixo:
                  </p>

                  <div className="qr-frame">
                    <img
                      src={
                        qrCodeData.imagemBase64
                          ? `data:image/jpeg;base64,${qrCodeData.imagemBase64}`
                          : qrCodeData.imagemUrl || qrDesenhadoLocal
                      }
                      alt="QR Code Pix"
                    />
                  </div>

                  <button onClick={copiarPixCopiaECola} className="btn-copy">
                    📋 Copiar código Pix Copia e Cola
                  </button>

                  <div className="qr-status">
                    <p className="qr-waiting">
                      <span className="pulse-dot" /> Verificando aprovação automaticamente. Não feche esta página.
                    </p>
                    {statusMensagem && <p className="status-success">{statusMensagem}</p>}
                    <small className="tx-ref">Ref. transação: {transactionId}</small>
                  </div>
                </div>
              ) : (
                <div className="processing-state">
                  <Spinner large />
                  <h3>{statusMensagem || 'Processando transação...'}</h3>
                  <p>Comunicando com o banco...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Etiqueta do Armário — resumo do pedido */}
        <aside className="locker-ticket">
          <div className="locker-ticket__plate">
            <div className="locker-ticket__hole" />
            <span className="plate-label">Armário</span>
            <span className="plate-number">{m_armario.nome}</span>
            <span className="plate-block">{nomearCorredor(escola, m_armario.corredor)}</span>
          </div>

          <div className="locker-ticket__perforation" />

          <div className="locker-ticket__body">
            {/* A locação é pelo ciclo letivo inteiro, não mensal: vale até a
                data de encerramento da escola, quando os armários são
                desvinculados. "1 mês" era errado e prometia ao aluno um preço
                mensal que não existe. */}
            <div className="summary-row">
              <span>Locação</span>
              <strong style={{ color: 'var(--paper-050)' }}>
                {modalidade === 'semestral' ? 'Semestral' : 'Anual'} {anoLetivo}
              </strong>
            </div>
            <div className="summary-row">
              <span>Válido até</span>
              <strong style={{ color: 'var(--paper-050)' }}>{validoAte}</strong>
            </div>
            <hr className="summary-divider" />
            <div className="summary-row total">
              <span>Total</span>
              <span className="price">R$ {Number(valorDaModalidade).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </aside>
      </div>

      {termosAbertos && <ModalTermos escola={escola} aoFechar={() => setTermosAbertos(false)} />}

      {/* Compra aprovada. Sem botão de fechar no X e sem clique no fundo: a
          única saída é o botão, para o aluno ler antes de sair. */}
      {aprovado && (
        <div className="lckp-modal__backdrop" role="presentation">
          <div className="lckp-modal lckp-aprovado" role="dialog" aria-modal="true" aria-labelledby="titulo-aprovado">
            <div className="lckp-aprovado__selo" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <h3 id="titulo-aprovado" className="lckp-aprovado__titulo">Pagamento processado</h3>
            <p className="lckp-aprovado__sub">Seu armário foi liberado.</p>

            <dl className="lckp-aprovado__dados">
              <div>
                <dt>Armário</dt>
                <dd>{m_armario.nome}</dd>
              </div>
              <div>
                <dt>{rotuloCorredor(escola)}</dt>
                <dd>{m_armario.corredor}</dd>
              </div>
              <div>
                <dt>Período</dt>
                <dd>{modalidade === 'semestral' ? 'Semestral' : 'Anual'}</dd>
              </div>
              <div>
                <dt>Válido até</dt>
                <dd>{validoAte}</dd>
              </div>
            </dl>

            <p className="lckp-aprovado__email">
              Enviamos a confirmação com estes dados para o seu e-mail
              institucional. Você também encontra tudo em <strong>Meu Armário</strong>.
            </p>

            <button
              type="button"
              className="lckp-btn lckp-aprovado__acao"
              onClick={() => navigate(`/${schoolCode}/meu-armario`)}
            >
              Ver meu armário
            </button>
          </div>
        </div>
      )}
    </div>
  );
}