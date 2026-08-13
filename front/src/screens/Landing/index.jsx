import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ligarAnimacoes } from '../../utils/revelar';
import './Landing.css';
import { leadsService } from '../../services/leadsService';
import { MARCA } from '../../theme/marca.js';
import logoLckp from '../../assets/logo_lckp1.png';


// ── PALETA PROFISSIONAL ──
// Vêm de theme/marca.js, que é a definição única da marca. Mantidas como
// constantes locais para não reescrever os 30 pontos de uso deste arquivo.
const NAVY = MARCA.navy;
const NAVY_DEEP = MARCA.navyDeep;
const GOLD = MARCA.gold;
const GOLD_SOFT = MARCA.goldSoft;
const SUCESSO = MARCA.sucesso;

const GRAO =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+";

/* ─────────────── ÍCONES ─────────────── */
const IconChave = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="7.5" cy="15.5" r="4.5" /><path d="M11 12l8-8M16 4l3 3M13 7l2.5 2.5" />
  </svg>
);
const IconPredio = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="3" width="10" height="18" rx="1" />
    <path d="M14 21v-7h6v7M7 7h.01M10.5 7h.01M7 10.5h.01M10.5 10.5h.01M7 14h.01M10.5 14h.01" />
  </svg>
);
const IconPix = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M7.5 7.5l2.6 2.6a2.7 2.7 0 0 0 3.8 0l2.6-2.6M16.5 16.5l-2.6-2.6a2.7 2.7 0 0 0-3.8 0l-2.6 2.6" />
  </svg>
);
const IconPainel = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 19V10M12 19V5M20 19v-6" />
  </svg>
);
const IconPaleta = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.7 1.6-1.5 0-.4-.15-.75-.4-1a1.6 1.6 0 0 1 1.15-2.7H16a3 3 0 0 0 3-3c0-4.4-3.6-9.8-7-9.8z" />
    <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const IconSeta = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const IconShield = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconLock = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const IconDoc = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
    <path d="M14 3v6h6M9 13h6M9 17h6" />
  </svg>
);
const IconCookie = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="9" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
const IconX = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconSetaBaixo = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);

/* ─────────────── DADOS ─────────────── */
const RECURSOS = [
  {
    titulo: 'Multi-escola de verdade',
    descricao: 'Cada instituição enxerga os próprios armários e alunos. Os dados de uma escola nunca aparecem para outra — quem gerencia é sempre o administrador da instituição certa.',
    Icone: IconPredio,
    destaque: true
  },
  {
    titulo: 'Pix ou cartão, liberação automática',
    descricao: 'O aluno paga direto no navegador. Assim que o pagamento for aprovado, o armário já aparece como ocupado — sem planilha, sem confirmação manual.',
    Icone: IconPix,
    destaque: false
  },
  {
    titulo: 'Painel próprio para coordenação',
    descricao: 'Cadastrar armário em lote, transferir aluno, ver quem está inadimplente. A escola resolve, sem precisar abrir chamado.',
    Icone: IconPainel,
    destaque: false
  },
  {
    titulo: 'A logo da sua escola em todo o portal',
    descricao: 'Adicione a logo da instituição pelo painel e escolha em quais telas ela aparece. O portal inteiro (login, mapa de armários e recibo) já nasce identificado com a escola, sobre um design profissional pronto.',
    Icone: IconPaleta,
    destaque: false
  }
];

const PASSOS = [
  { numero: '01', titulo: 'Aluno escolhe o armário', descricao: 'Mapa por corredor, só os disponíveis ficam clicáveis.' },
  { numero: '02', titulo: 'Paga por Pix ou cartão', descricao: 'Checkout de pagamento direto na plataforma, sem sair do site da escola.' },
  { numero: '03', titulo: 'Armário liberado na hora', descricao: 'Pagamento aprovado libera o vínculo automaticamente.' }
];

const METRICAS = [
  { valor: '100%', rotulo: 'digital, sem planilha' },
  { valor: '3', rotulo: 'cliques até alugar' },
  { valor: '1s', rotulo: 'liberação após o pagamento' },
  { valor: '24/7', rotulo: 'disponível pro aluno' }
];

const FAQ = [
  {
    pergunta: 'Preciso trocar meu sistema atual?',
    resposta: 'Não. O Lckp é um portal independente de locação de armários. Ele roda em paralelo ao seu sistema acadêmico e não exige migração de dados.'
  },
  {
    pergunta: 'Como funciona o pagamento?',
    resposta: 'O aluno paga por Pix ou cartão direto no navegador, dentro do portal da sua escola. A aprovação do Mercado Pago libera o armário automaticamente.'
  },
  {
    pergunta: 'Como vocês tratam os dados da escola e dos alunos (LGPD)?',
    resposta: 'Seguimos a LGPD. Armazenamos apenas os dados necessários (CNPJ, contatos da escola e dos alunos, e as credenciais/API de pagamento configuradas) com criptografia e acesso restrito. Você pode solicitar acesso, correção ou exclusão dos dados a qualquer momento — veja nossa Política de Privacidade.'
  },
  {
    pergunta: 'A escola precisa de conhecimento técnico?',
    resposta: 'Não. Você cadastra os armários em lote pelo painel, define preços e cores. Todo o resto — mapa, checkout e liberação — é automático.'
  },
  {
    pergunta: 'Posso personalizar com a logo e as cores da escola?',
    resposta: 'Sim. O portal inteiro nasce com a identidade visual da sua instituição: logo, paleta de cores, recibo e mapa de armários.'
  }
];

/* ─────────────── TEXTOS LEGAIS (LGPD) ─────────────── */
const POLITICA_PRIVACIDADE = [
  {
    titulo: '1. Quem somos e quem é o controlador',
    paragrafos: [
      'O Lckp é uma plataforma de gestão de locação de armários escolares. O controlador dos dados pessoais tratados é a própria plataforma, atuando em conjunto com a escola contratante, que permanece responsável pelos dados de seus alunos.'
    ]
  },
  {
    titulo: '2. Quais dados coletamos e armazenamos',
    paragrafos: [
      'Dados da escola: razão social, CNPJ, endereço, e-mail institucional, telefone e dados bancários da instituição.',
      'Dados de contato de quem cadastra/gerencia: nome, e-mail e telefone.',
      'Dados dos alunos: nome, e-mail, telefone, rm e ra, data de nascimento, turma, número do armário alugado, histórico de pagamentos e recibo.',
      'Dados de pagamento e integração bancária: preferências de pagamento e as chaves/credenciais de API das instituições financeiras (ex.: chave de API do Mercado Pago) configuradas pela escola para processar pagamentos.',
      'Dados de navegação: cookies essenciais e, mediante consentimento, cookies de análise de uso.'
    ]
  },
  {
    titulo: '3. Para que usamos esses dados',
    paragrafos: [
      'Gestão da locação de armários (vínculo aluno-armário), cobrança e liberação automática após pagamento, emissão de recibos, suporte técnico, prevenção de fraudes e cumprimento de obrigações legais.',
      'As chaves de API bancárias são usadas exclusivamente para processar e confirmar pagamentos da locação, nunca para qualquer outra finalidade.'
    ]
  },
  {
    titulo: '4. Base legal (LGPD — Lei nº 13.709/2018)',
    paragrafos: [
      'Tratamos seus dados com base no art. 7º da LGPD: execução de contrato (inciso V), consentimento (inciso I), cumprimento de obrigação legal ou regulatória (inciso II) e legítimo interesse (inciso IX).',
      'Dados de alunos menores de idade são tratados somente com o consentimento dos pais ou responsáveis, diretamente ou por intermédio da escola, nos termos do art. 14 da LGPD.'
    ]
  },
  {
    titulo: '5. Compartilhamento de dados',
    paragrafos: [
      'Compartilhamos dados apenas com: (a) processadores de pagamento (ex.: Mercado Pago), estritamente para aprovar e liquidar transações; (b) provedores de infraestrutura e hospedagem; (c) autoridades públicas, quando houver ordem judicial ou obrigação legal.',
      'Nunca vendemos dados pessoais. Os dados de uma escola ou de seus alunos jamais são exibidos para outra instituição.'
    ]
  },
  {
    titulo: '6. Segurança e armazenamento',
    paragrafos: [
      'Os dados são transmitidos com criptografia (TLS) e armazenados com controle de acesso, segregação por escola e monitoramento de acessos. As credenciais de API de pagamento são mantidas criptografadas e com acesso restrito.',
      'Mantemos os dados pelo tempo necessário às finalidades descritas ou pelo prazo exigido por lei, após o prazo os dados são eliminados ou anonimizados.'
    ]
  },
  {
    titulo: '7. Seus direitos como titular (art. 18 da LGPD)',
    paragrafos: [
      'Você e os responsáveis pelos alunos podem solicitar a qualquer momento: confirmação da existência de tratamento, acesso aos dados, correção, anonimização ou bloqueio, portabilidade, eliminação dos dados tratados com consentimento, informação sobre compartilhamento e revogação do consentimento.',
      'Para exercer seus direitos, entre em contato pelo e-mail: lckp.suporte@gmail.com. Responderemos em até 15 dias.'
    ]
  },
  {
    titulo: '8. Alterações desta política',
    paragrafos: [
      'Esta política pode ser atualizada a qualquer momento. A versão vigente estará sempre disponível nesta página e as alterações relevantes serão comunicadas por e-mail.'
    ]
  }
];

const TERMOS_USO = [
  {
    titulo: '1. Objeto',
    paragrafos: [
      'Estes Termos regulam o uso da plataforma Lckp pelas escolas contratantes (locação de armários escolares) e pelos alunos que utilizam o portal para selecionar e alugar armários.'
    ]
  },
  {
    titulo: '2. Cadastro e responsabilidades da escola',
    paragrafos: [
      'A escola é responsável pela veracidade dos dados cadastrados (CNPJ, contatos e configurações), pelo gerenciamento dos armários e pela política de uso definida para seus alunos.',
      'A escola deve manter atualizadas as credenciais de pagamento e garantir que possui autorização para o tratamento dos dados de seus alunos na forma da LGPD.'
    ]
  },
  {
    titulo: '3. Locação e pagamento',
    paragrafos: [
      'O valor e a duração da locação são definidos pela escola. O pagamento é processado por instituição de pagamento integrada (ex.: Mercado Pago) e a liberação do armário ocorre automaticamente após a aprovação.',
      'Todas as transações são regidas também pelos termos do processador de pagamento utilizado.'
    ]
  },
  {
    titulo: '4. Uso do painel',
    paragrafos: [
      'O acesso ao painel é pessoal e intransferível. A escola deve manter a confidencialidade de seus acessos e responderá por ações realizadas com suas credenciais.',
      'É vedado o uso da plataforma para qualquer finalidade ilícita ou diferente da locação de armários.'
    ]
  },
  {
    titulo: '5. Privacidade e LGPD',
    paragrafos: [
      'O tratamento de dados pessoais pela plataforma e pela escola observa a Política de Privacidade do Lckp e a Lei nº 13.709/2018 (LGPD).'
    ]
  },
  {
    titulo: '6. Limitação de responsabilidade',
    paragrafos: [
      'A plataforma envidará esforços para manter o serviço disponível e seguro, mas não se responsabiliza por falhas de internet, indisponibilidade de processadores de pagamento ou eventos de força maior.',
      'A escola é responsável pelo cumprimento de suas obrigações perante os alunos no que diz respeito à locação física dos armários.'
    ]
  },
  {
    titulo: '7. Rescisão',
    paragrafos: [
      'Qualquer das partes pode encerrar a relação contratual mediante aviso prévio, na forma do contrato firmado. Ao encerrar, os dados serão tratados conforme a Política de Privacidade.'
    ]
  },
  {
    titulo: '8. Foro',
    paragrafos: [
      'Fica eleito o foro da comarca da sede da escola contratante para dirimir eventuais controvérsias, sem prejuízo de normas de ordem pública.'
    ]
  }
];

const CAMPOS_INICIAIS = {
  nome_escola: '',
  contato_nome: '',
  email: '',
  telefone: '',
  mensagem: '',
  lgpd_aceito: false
};

/* ─────────────── HERO: LISTA DE ARMÁRIOS ANIMADA ─────────────── */
function HeroArmarios() {
  const [selecionado, setSelecionado] = useState(null);
  const [animando, setAnimando] = useState(false);
  const esteiraRef = useRef(null);

  // Cor para estado Ocupado
  const ERRO = '#EF4444';

  const armarios = [
    { id: 1, num: 'A01', ocupado: false },
    { id: 2, num: 'A02', ocupado: true },
    { id: 3, num: 'A03', ocupado: false },
    { id: 4, num: 'B01', ocupado: false },
    { id: 5, num: 'B02', ocupado: true },
    { id: 6, num: 'B03', ocupado: false },
    { id: 7, num: 'C01', ocupado: false },
    { id: 8, num: 'C02', ocupado: false },
    { id: 9, num: 'C03', ocupado: true },
    { id: 10, num: 'D01', ocupado: false },
    { id: 11, num: 'D02', ocupado: false },
    { id: 12, num: 'D03', ocupado: false }
  ];

  // A entrada da esteira e o escalonamento dos cartões são keyframes CSS
  // (.esteira-entra em Landing.css), aplicados na própria marcação.

  const aoClicar = (armario) => {
    if (armario.ocupado || animando) return;
    setAnimando(true);
    setSelecionado(armario.id);

    const cartao = esteiraRef.current?.querySelector(`[data-armario="${armario.id}"]`);
    if (!cartao) {
      setAnimando(false);
      return;
    }

    // Era uma timeline gsap; agora é um keyframe único disparado pela classe.
    // Libera o clique quando a animação termina — com fallback por timer, caso
    // o evento não dispare (aba em segundo plano, movimento reduzido).
    const encerrar = () => {
      cartao.classList.remove('armario-escolhido');
      setAnimando(false);
    };
    cartao.addEventListener('animationend', encerrar, { once: true });
    const reserva = setTimeout(encerrar, 900);
    cartao.addEventListener('animationend', () => clearTimeout(reserva), { once: true });

    // Reinicia a animação caso o mesmo cartão seja clicado de novo.
    cartao.classList.remove('armario-escolhido');
    void cartao.offsetWidth;
    cartao.classList.add('armario-escolhido');
  };

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[28px] blur-2xl transform-gpu" style={{ background: `radial-gradient(circle at 50% 20%, ${GOLD_SOFT}, transparent 65%)` }} aria-hidden="true" />
      <div ref={esteiraRef} className="esteira-entra relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Mapa de armários</span>
          <span className="text-[11px] text-white/40 flex items-center gap-1.5">
            <IconSetaBaixo className="w-3.5 h-3.5" /> escolha um armário
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {armarios.map((a, i) => {
            const isSel = selecionado === a.id;
            return (
              <button
                key={a.id}
                data-armario={a.id}
                onClick={() => aoClicar(a)}
                disabled={a.ocupado || animando}
                className={`relative aspect-[4/3] rounded-xl border flex flex-col items-center justify-center gap-1 transition-[background-color,border-color,box-shadow,transform] duration-150 transform-gpu ${
                  a.ocupado ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:-translate-y-0.5'
                }`}
                style={{
                  // --i alimenta o animation-delay do stagger em Landing.css
                  '--i': i,
                  borderColor: isSel ? SUCESSO : a.ocupado ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.12)',
                  backgroundColor: isSel ? 'rgba(61,220,151,0.12)' : a.ocupado ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.05)',
                  boxShadow: isSel ? `0 0 0 1px ${SUCESSO}, 0 8px 24px -8px rgba(61,220,151,0.4)` : 'none'
                }}
              >
                <span className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" style={{
                  backgroundColor: isSel ? 'rgba(61,220,151,0.2)' : a.ocupado ? 'rgba(239, 68, 68, 0.2)' : 'rgba(232,180,74,0.12)',
                  color: isSel ? SUCESSO : a.ocupado ? ERRO : GOLD
                }}>
                  {isSel ? <IconCheck className="w-4 h-4" /> : <IconChave className="w-4 h-4" />}
                </span>
                <span className={`text-[11px] font-semibold ${isSel ? 'text-[#3DDC97]' : a.ocupado ? 'text-red-400' : 'text-white/70'}`}>{a.num}</span>
                {isSel && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: SUCESSO }}>
                    <IconCheck className="w-3 h-3 text-[#06122B]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10 text-[11px] text-white/40">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} /> disponível</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ERRO }} /> ocupado</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: SUCESSO }} /> escolhido</span>
        </div>
        {selecionado && (
          <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3 text-sm" style={{ backgroundColor: 'rgba(61,220,151,0.1)', border: '1px solid rgba(61,220,151,0.3)' }}>
            <IconCheck className="w-4 h-4 shrink-0" style={{ color: SUCESSO }} />
            <span className="text-white/80">Armário <strong style={{ color: SUCESSO }}>{armarios.find((a) => a.id === selecionado)?.num}</strong> selecionado — pronto para o pagamento</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── FAQ ─────────────── */
function FAQItem({ pergunta, resposta, aberto, aoAlternar }) {
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button onClick={aoAlternar} className="cursor-pointer w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="font-semibold text-[15px]">{pergunta}</span>
        <span className={`shrink-0 w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/60 transition-transform duration-300 ${aberto ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div className={`grid transition-[background-color,border-color,box-shadow,transform] duration-150 transform-gpu ease-out ${aberto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-white/55 text-sm leading-relaxed">{resposta}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── MODAL LEGAL ─────────────── */
function ModalLegal({ aberto, titulo, icone, secoes, aoFechar }) {
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [aberto]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={aoFechar} />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d2a52] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: GOLD_SOFT, color: GOLD }}>{icone}</span>
            <h3 className="font-bold text-lg">{titulo}</h3>
          </div>
          <button onClick={aoFechar} className="cursor-pointer w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors" aria-label="Fechar">
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {secoes.map((secao) => (
            <div key={secao.titulo}>
              <h4 className="font-semibold text-[15px] mb-1.5" style={{ color: GOLD }}>{secao.titulo}</h4>
              {secao.paragrafos.map((p, i) => (
                <p key={i} className="text-white/65 text-sm leading-relaxed mb-2">{p}</p>
              ))}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.03] flex items-center justify-between gap-3">
          <p className="text-[11px] text-white/40">Última atualização: Agosto de 2026</p>
          <button onClick={aoFechar} className="cursor-pointer text-sm font-semibold px-5 py-2 rounded-lg hover:brightness-110 transition-[transform,filter] duration-150 transform-gpu active:scale-[0.98]" style={{ backgroundColor: GOLD, color: NAVY }}>Entendi</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── BANNER DE COOKIES ─────────────── */
function CookieBanner({ aoAbrirPrivacidade, consentimento, aoDefinir }) {
  if (consentimento) return null;
  const aceitarTodos = () => { localStorage.setItem('lckp-cookie-consent', 'todos'); aoDefinir('todos'); };
  const apenasEssenciais = () => { localStorage.setItem('lckp-cookie-consent', 'essenciais'); aoDefinir('essenciais'); };
  return (
    <div className="fixed bottom-0 inset-x-0 z-[90] p-4">
      <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-[#0d2a52]/95 backdrop-blur-md shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <span className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center" style={{ backgroundColor: GOLD_SOFT, color: GOLD }}>
          <IconCookie className="w-5 h-5" />
        </span>
        <div className="flex-1 text-sm text-white/65 leading-relaxed">
          Usamos cookies essenciais para o funcionamento da plataforma e, se você autorizar, cookies de análise para melhorar sua experiência. Consulte nossa{' '}
          <button onClick={aoAbrirPrivacidade} className="cursor-pointer underline font-medium hover:opacity-80" style={{ color: GOLD }}>Política de Privacidade</button>.
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={apenasEssenciais} className="cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5 transition-colors">Apenas essenciais</button>
          <button onClick={aceitarTodos} className="cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-[transform,filter] duration-150 transform-gpu active:scale-[0.98]" style={{ backgroundColor: GOLD, color: NAVY }}>Aceitar todos</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── MODAL DE ACESSO DA ESCOLA (CÓDIGO) ─────────────── */
function ModalAcessoEscola({ aberto, aoFechar }) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const modalRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') aoFechar(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [aberto, aoFechar]);

  useEffect(() => {
    if (aberto) {
      setCodigo('');
      setErro('');
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const codLimpo = codigo.trim().toLowerCase();
    if (!codLimpo) {
      setErro('Por favor, informe o código da sua escola.');
      return;
    }

    if (navigate) {
      navigate(`/${codLimpo}`);
    } else {
      window.location.href = `/${codLimpo}`;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Acessar minha escola">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={aoFechar} />
      <div ref={modalRef} className="modal-entra relative w-full max-w-md flex flex-col rounded-2xl border border-white/10 bg-[#0d2a52] shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: GOLD_SOFT, color: GOLD }}>
              <IconPredio className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-lg">Acessar minha escola</h3>
              <p className="text-white/50 text-xs mt-0.5">Informe o código fornecido pela sua instituição.</p>
            </div>
          </div>
          <button onClick={aoFechar} className="cursor-pointer w-8 h-8 shrink-0 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors" aria-label="Fechar">
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg p-3 text-sm">{erro}</div>
            )}
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Código da escola</label>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                autoFocus
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#E8B44A] uppercase placeholder:normal-case"
                placeholder="Ex: bentoquirino"
              />
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full font-semibold px-6 py-3.5 rounded-lg transition-transform active:scale-[0.98] hover:brightness-110 flex items-center justify-center gap-2"
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              Acessar portal
              <IconSeta className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── MODAL DE CADASTRO DE ESCOLA ─────────────── */
function ModalCadastro({ aberto, aoFechar, aoAbrirPrivacidade }) {
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') aoFechar(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [aberto, aoFechar]);

  useEffect(() => {
    if (aberto) {
      setErro('');
      setSucesso('');
      setCampos(CAMPOS_INICIAIS);
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleChange = (campo) => (e) => {
    const valor = campo === 'lgpd_aceito' ? e.target.checked : e.target.value;
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    if (!campos.lgpd_aceito) {
      setErro('Você precisa aceitar a Política de Privacidade para enviar seus dados (exigência da LGPD).');
      return;
    }
    setEnviando(true);
    try {
      const resultado = await leadsService.enviarContato({
        nome_escola: campos.nome_escola,
        contato_nome: campos.contato_nome,
        email: campos.email,
        telefone: campos.telefone,
        mensagem: campos.mensagem,
        lgpd_aceito: true
      });
      setSucesso(resultado.mensagem || 'Recebemos seu contato! Nosso time vai falar com você em breve.');
      setCampos(CAMPOS_INICIAIS);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Cadastro de escola">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={aoFechar} />
      <div ref={modalRef} className="modal-entra relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d2a52] shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-white/[0.03]">
          <div>
            <h3 className="font-bold text-lg">Cadastre sua escola</h3>
            <p className="text-white/50 text-xs mt-0.5">Nosso time entra em contato para apresentar o Lckp.</p>
          </div>
          <button onClick={aoFechar} className="cursor-pointer w-8 h-8 shrink-0 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors" aria-label="Fechar">
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {sucesso ? (
            <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 rounded-lg p-4 text-sm flex items-start gap-3">
              <IconCheck className="w-5 h-5 shrink-0 mt-0.5" />
              {sucesso}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erro && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg p-3 text-sm">{erro}</div>
              )}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Nome da escola</label>
                <input type="text" required value={campos.nome_escola} onChange={handleChange('nome_escola')} disabled={enviando}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#E8B44A]"
                  placeholder="Ex: ETEC Bento Quirino" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Seu nome</label>
                  <input type="text" required value={campos.contato_nome} onChange={handleChange('contato_nome')} disabled={enviando}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#E8B44A]"
                    placeholder="Ex: Maria Silva" />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Telefone</label>
                  <input type="text" value={campos.telefone} onChange={handleChange('telefone')} disabled={enviando}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#E8B44A]"
                    placeholder="(19) 99999-9999" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">E-mail</label>
                <input type="email" required value={campos.email} onChange={handleChange('email')} disabled={enviando}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#E8B44A]"
                  placeholder="contato@suaescola.com.br" />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Mensagem (opcional)</label>
                <textarea rows={3} value={campos.mensagem} onChange={handleChange('mensagem')} disabled={enviando}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-white outline-none transition-colors focus:border-[#E8B44A] resize-none"
                  placeholder="Conte um pouco sobre a sua escola" />
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={campos.lgpd_aceito} onChange={handleChange('lgpd_aceito')} disabled={enviando} className="mt-0.5 w-4 h-4 accent-[#E8B44A] cursor-pointer" />
                <span className="text-xs text-white/55 leading-relaxed">
                  Li e aceito a{' '}
                  <button type="button" onClick={aoAbrirPrivacidade} className="cursor-pointer underline font-medium hover:opacity-80" style={{ color: GOLD }}>
                    Política de Privacidade
                  </button>{' '}
                  e autorizo o Lckp a armazenar e tratar os dados informados (incluindo dados da escola e dados dos alunos) conforme a LGPD — Lei nº 13.709/2018. *
                </span>
              </label>

              <button type="submit" disabled={enviando}
                className="cursor-pointer w-full font-semibold px-6 py-3.5 rounded-lg transition-transform active:scale-[0.98] hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none"
                style={{ backgroundColor: GOLD, color: NAVY }}>
                {enviando ? 'Enviando...' : 'Enviar contato'}
              </button>
              <p className="text-[11px] text-white/35 text-center">Seus dados são protegidos e tratados conforme a LGPD.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── COMPONENTE PRINCIPAL ─────────────── */
export default function Landing() {
  const [faqAberto, setFaqAberto] = useState(0);
  const [modalLegal, setModalLegal] = useState(null); // 'privacidade' | 'termos' | null
  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalAcesso, setModalAcesso] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem('lckp-cookie-consent');
      if (salvo) setCookieConsent(salvo);
    } catch { /* ignore */ }
  }, []);

  // Animações de entrada: IntersectionObserver + transições CSS (ver
  // utils/revelar.js e Landing.css). Substituiu gsap + ScrollTrigger.
  useEffect(() => ligarAnimacoes(rootRef.current), []);

  const abrirCadastro = () => setModalCadastro(true);
  const abrirAcesso = () => setModalAcesso(true);

  return (
    <div
      ref={rootRef}
      className="min-h-screen text-white font-sans [scroll-behavior:smooth]"
      style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DEEP} 60%, ${NAVY_DEEP} 100%)` }}
    >
      <div className="fixed inset-0 pointer-events-none mix-blend-overlay opacity-40" style={{ backgroundImage: `url(${GRAO})` }} aria-hidden="true" />

      {/* ═══ HEADER ═══ */}
      <header className="relative flex items-center justify-between px-4 md:px-12 py-4 max-w-6xl mx-auto">

        {/* Logo ajustada */}
        <span className="flex items-center ml-2 sm:ml-0">
          <img
            src={logoLckp}
            alt="LCKP"
            className="h-22 sm:h-24 md:h-32 lg:h-40 w-auto object-contain"
          />
        </span>

        <nav className="flex items-center gap-10">

          <a href="#como-funciona" className="cursor-pointer hidden sm:inline text-sm text-white/70 hover:text-white transition-colors">Como funciona</a>
          <a href="#recursos" className="cursor-pointer hidden md:inline text-sm text-white/70 hover:text-white transition-colors">Recursos</a>
          <a href="#privacidade" className="cursor-pointer hidden md:inline text-sm text-white/70 hover:text-white transition-colors"> Privacidade </a>
          <a href="#faq" className="cursor-pointer hidden md:inline text-sm text-white/70 hover:text-white transition-colors">Dúvidas</a>

          {/* Botão para Acessar Minha Escola */}
          <button 
            onClick={abrirAcesso} 
            className="cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg transition-transform active:scale-[0.97] hover:brightness-110" style={{ backgroundColor: GOLD, color: NAVY }}>
            Acessar minha escola
          </button>

        </nav>

      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative max-w-6xl mx-auto px-6 md:px-12 pt-14 pb-20 md:pt-20 md:pb-28 grid md:grid-cols-2 gap-14 items-center">
        <div>
          <span data-hero className="inline-block text-xs font-semibold tracking-wide uppercase text-[#E8B44A] border border-[#E8B44A]/30 bg-[#E8B44A]/10 rounded-full px-3 py-1 mb-5">
            Locação de armários escolares
          </span>
          <h1 data-hero className="text-[2.5rem] leading-[1.08] md:text-6xl md:leading-[1.05] font-extrabold [text-wrap:balance] mb-6 text-white/90">
            O armário da sua escola, <span style={{ color: GOLD }}>alugado em três cliques</span>
          </h1>
          <p data-hero className="text-white/60 text-lg mb-9 max-w-md [text-wrap:pretty]">
            Sua instituição cadastra os armários, define o preço, e o Lckp cuida do mapa, do pagamento e da liberação — com a cor e a logo da sua escola do início ao fim.
          </p>
          <div data-hero className="flex flex-wrap gap-4">
            <button onClick={abrirCadastro} className="cursor-pointer font-semibold px-6 py-3.5 rounded-lg transition-transform active:scale-[0.98] hover:brightness-110" style={{ backgroundColor: GOLD, color: NAVY }}>
              Quero levar o Lckp para minha escola
            </button>
            <a href="#como-funciona" className="cursor-pointer border border-white/15 text-white px-6 py-3.5 rounded-lg hover:bg-white/5 transition-colors active:scale-[0.98]">
              Ver como funciona
            </a>
          </div>
        </div>
        <div data-hero>
          <HeroArmarios />
        </div>
      </section>

      {/* ═══ MÉTRICAS ═══ */}
      <section className="relative max-w-6xl mx-auto px-6 md:px-12 py-12 border-t border-white/[0.06]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {METRICAS.map((m) => (
            <div key={m.rotulo} data-metrica className="text-center md:text-left">
              <div className="text-3xl md:text-4xl font-extrabold" style={{ color: GOLD }}>{m.valor}</div>
              <div className="text-white/50 text-sm mt-1">{m.rotulo}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ COMO FUNCIONA ═══ */}
      <section id="como-funciona" className="relative max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20 border-t border-white/[0.06] scroll-mt-20">
        <div data-reveal className="max-w-lg mb-12">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-[#E8B44A] border border-[#E8B44A]/30 bg-[#E8B44A]/10 rounded-full px-3 py-1 mb-4">Como funciona</span>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 [text-wrap:balance]">Do clique à chave, sem planilha no meio</h2>
          <p className="text-white/50">O fluxo inteiro roda dentro do portal da própria escola.</p>
        </div>
        <div data-passos className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
          <div className="hidden md:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
          {PASSOS.map((passo) => (
            <div key={passo.numero} data-passo className="relative">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold mb-4 relative z-10 transition-transform hover:scale-110" style={{ backgroundColor: NAVY_DEEP, border: `1.5px solid ${GOLD}`, color: GOLD }}>
                {passo.numero}
              </span>
              <h3 className="font-semibold text-lg mb-1.5">{passo.titulo}</h3>
              <p className="text-white/50 text-sm leading-relaxed max-w-[26ch]">{passo.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ RECURSOS ═══ */}
      <section id="recursos" className="relative max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20 border-t border-white/[0.06] scroll-mt-20">
        <div data-reveal className="max-w-lg mb-12">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-[#E8B44A] border border-[#E8B44A]/30 bg-[#E8B44A]/10 rounded-full px-3 py-1 mb-4">Recursos</span>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 [text-wrap:balance]">O que muda para sua coordenação</h2>
          <p className="text-white/50">Feito para quem administra vários prédios, não só um.</p>
        </div>
        {/* mt-[50px]: preserva o respiro que existia quando as animações eram
            feitas em gsap. Ele deixava um transform inline residual nos cards, e
            elemento com transform impede colapso de margem — o espaço vinha daí.
            Com as animações em CSS a margem colapsa, então o afastamento passa a
            ser declarado de propósito, em vez de efeito colateral. */}
        <div data-reveal-group className="grid md:grid-cols-3 gap-5 mt-[50px]">
          {RECURSOS.map(({ titulo, descricao, Icone, destaque }) => (
            <div
              key={titulo}
              data-reveal-item
              className={`rounded-2xl p-7 border transition-transform hover:-translate-y-1 duration-300 ${destaque ? 'md:col-span-2' : ''}`}
              style={{
                backgroundColor: destaque ? GOLD_SOFT : 'rgba(255,255,255,0.03)',
                borderColor: destaque ? 'rgba(232,180,74,0.25)' : 'rgba(255,255,255,0.08)'
              }}
            >
              <Icone className="w-6 h-6 mb-4" style={{ color: destaque ? GOLD : '#ffffff99' }} />
              <h3 className="font-semibold text-lg mb-2">{titulo}</h3>
              <p className="text-white/55 text-sm leading-relaxed max-w-md">{descricao}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRIVACIDADE & SEGURANÇA (LGPD) ═══ */}
      <section id="privacidade" className="relative max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20 border-t border-white/[0.06] scroll-mt-20">
        <div data-reveal className="max-w-lg mb-12">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-[#E8B44A] border border-[#E8B44A]/30 bg-[#E8B44A]/10 rounded-full px-3 py-1 mb-4">Privacidade e segurança</span>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 [text-wrap:balance]">Seus dados tratados de acordo com a LGPD</h2>
          <p className="text-white/50">O Lckp armazena e protege os dados da sua escola e dos seus alunos com transparência e responsabilidade.</p>
        </div>
        <div data-reveal className="rounded-2xl p-8 md:p-10 border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-5">
              {[
                { Icone: IconShield, titulo: 'Criptografia e acesso restrito', texto: 'Dados transmitidos com TLS e armazenados com controle de acesso, segregação por escola e monitoramento.' },
                { Icone: IconLock, titulo: 'Chave de API de pagamento protegida', texto: 'As credenciais bancárias (ex.: chave de API do Mercado Pago) ficam criptografadas e são usadas apenas para processar pagamentos.' },
                { Icone: IconDoc, titulo: 'Seus direitos garantidos', texto: 'Você pode solicitar acesso, correção, portabilidade ou exclusão dos dados a qualquer momento, conforme o art. 18 da LGPD.' }
              ].map(({ Icone, titulo, texto }) => (
                <div key={titulo} className="flex gap-4">
                  <span className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD_SOFT, color: GOLD }}>
                    <Icone className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-[15px] mb-1">{titulo}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{texto}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: GOLD_SOFT }}>
              <div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: GOLD }}>Transparência total</h3>
                <p className="text-white/55 text-sm leading-relaxed">
                  Entenda exatamente quais dados coletamos — incluindo CNPJ e contatos da escola, dados dos alunos e credenciais de integração bancária — e como você pode exercer seus direitos.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button onClick={() => setModalLegal('privacidade')} className="cursor-pointer flex-1 text-sm font-semibold px-5 py-3 rounded-lg hover:brightness-110 transition-[transform,filter] duration-150 transform-gpu active:scale-[0.98]" style={{ backgroundColor: GOLD, color: NAVY }}>
                  Ler Política de Privacidade
                </button>
                <button onClick={() => setModalLegal('termos')} className="cursor-pointer flex-1 text-sm font-semibold px-5 py-3 rounded-lg border border-white/15 text-white/85 hover:bg-white/5 transition-colors">
                  Termos de Uso
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="relative max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-20 border-t border-white/[0.06] scroll-mt-20">
        <div data-reveal className="max-w-lg mb-10">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-[#E8B44A] border border-[#E8B44A]/30 bg-[#E8B44A]/10 rounded-full px-3 py-1 mb-4">Dúvidas frequentes</span>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 [text-wrap:balance]">Perguntas que as escolas fazem</h2>
          <p className="text-white/50">Respostas diretas para você decidir com segurança.</p>
        </div>
        <div data-reveal className="space-y-3">
          {FAQ.map((item, i) => (
            <FAQItem key={i} pergunta={item.pergunta} resposta={item.resposta} aberto={faqAberto === i} aoAlternar={() => setFaqAberto(faqAberto === i ? -1 : i)} />
          ))}
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section data-cta className="relative max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20 border-t border-white/[0.06]">
        <div
          className="rounded-3xl p-10 md:p-14 text-center border border-[#E8B44A]/25"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(232,180,74,0.12), transparent 70%)',
            backgroundColor: 'rgba(255,255,255,0.02)'
          }}
        >
          <h2 className="text-2xl md:text-4xl font-extrabold [text-wrap:balance] mb-4">Pronto para tirar a planilha do caminho?</h2>
          <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
            Cadastre sua escola e veja o mapa de armários, o pagamento e a liberação rodando no portal com a cara da sua escola.
          </p>
          <button onClick={abrirCadastro} className="cursor-pointer inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-lg transition-transform active:scale-[0.98] hover:brightness-110" style={{ backgroundColor: GOLD, color: NAVY }}>
            Quero levar o Lckp para minha escola
            <IconSeta className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative max-w-6xl mx-auto px-6 md:px-12 py-10 border-t border-white/[0.06]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo do Footer atualizada */}
          <span className="flex items-center">
            <img 
              src={logoLckp} 
              alt="LCKP" 
              className="h-12 md:h-16 w-auto object-contain" 
            />
          </span>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50">
            <button onClick={() => setModalLegal('privacidade')} className="cursor-pointer hover:text-white transition-colors underline-offset-4 hover:underline">Política de Privacidade</button>
            <button onClick={() => setModalLegal('termos')} className="cursor-pointer hover:text-white transition-colors underline-offset-4 hover:underline">Termos de Uso</button>
            <span className="text-white/30 text-xs">Conformidade com a LGPD (Lei nº 13.709/2018)</span>
          </div>
        </div>
        <p className="text-center text-white/40 text-sm mt-6">© 2026 Lckp — Sistema de Locação de Armários Escolares</p>
      </footer>

      {/* ═══ MODAIS LEGAIS ═══ */}
      <ModalLegal aberto={modalLegal === 'privacidade'} titulo="Política de Privacidade" icone={<IconShield className="w-5 h-5" />} secoes={POLITICA_PRIVACIDADE} aoFechar={() => setModalLegal(null)} />
      <ModalLegal aberto={modalLegal === 'termos'} titulo="Termos de Uso" icone={<IconDoc className="w-5 h-5" />} secoes={TERMOS_USO} aoFechar={() => setModalLegal(null)} />

      {/* ═══ MODAL DE ACESSO DA ESCOLA ═══ */}
      <ModalAcessoEscola
        aberto={modalAcesso}
        aoFechar={() => setModalAcesso(false)}
      />

      {/* ═══ MODAL DE CADASTRO ═══ */}
      <ModalCadastro
        aberto={modalCadastro}
        aoFechar={() => setModalCadastro(false)}
        aoAbrirPrivacidade={() => setModalLegal('privacidade')}
      />

      {/* ═══ BANNER DE COOKIES ═══ */}
      <CookieBanner consentimento={cookieConsent} aoDefinir={setCookieConsent} aoAbrirPrivacidade={() => setModalLegal('privacidade')} />
    </div>
  );
}