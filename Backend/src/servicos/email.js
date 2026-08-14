// Envio de e-mail transacional pelo Resend.
//
// Só existe um e-mail hoje: a confirmação de que o armário foi liberado. É o
// comprovante que o aluno guarda — número do armário, prazo e valor.
//
// A chave vem de RESEND_API_KEY. Sem ela o sistema NÃO quebra: o envio é
// desligado e registrado em log. Um pagamento aprovado não pode falhar porque
// o e-mail não saiu.
//
// Chamado por HTTP direto, sem o SDK: é uma requisição só, e uma dependência a
// menos é uma dependência a menos para manter atualizada.

const API = 'https://api.resend.com/emails';

// O remetente precisa ser de domínio VERIFICADO no Resend (SPF + DKIM no DNS).
// Sem verificar, o Resend só entrega para o e-mail dono da conta — e quem
// testou jura que "funcionou", porque a mensagem dele chegou.
const REMETENTE_PADRAO = 'LockUp <nao-responda@lckp.com.br>';

const escapar = (texto) =>
    String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const formatarMoeda = (valor) =>
    Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const emailHabilitado = () => Boolean(process.env.RESEND_API_KEY);

// Envia e devolve { ok, id } ou { ok:false, erro }. NUNCA lança: quem chama
// está no meio de um fluxo de pagamento já concluído.
const enviar = async ({ para, assunto, html }) => {
    const chave = process.env.RESEND_API_KEY;
    if (!chave) {
        console.warn('[LCKP EMAIL] RESEND_API_KEY ausente — envio desligado.');
        return { ok: false, erro: 'sem_chave' };
    }
    if (!para) return { ok: false, erro: 'sem_destinatario' };

    try {
        const resposta = await fetch(API, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${chave}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.EMAIL_REMETENTE || REMETENTE_PADRAO,
                to: [para],
                subject: assunto,
                html
            })
        });

        const corpo = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            // O erro do Resend é específico e útil ("domain not verified",
            // "invalid from"). Registrar o texto poupa meia hora de adivinhação.
            console.error('[LCKP EMAIL] Resend recusou:', resposta.status, JSON.stringify(corpo).slice(0, 300));
            return { ok: false, erro: corpo?.message || `http_${resposta.status}` };
        }

        return { ok: true, id: corpo?.id };
    } catch (err) {
        console.error('[LCKP EMAIL] Falha de rede ao enviar:', err.message);
        return { ok: false, erro: err.message };
    }
};

// Confirmação da locação. Estrutura em tabela e estilo embutido porque cliente
// de e-mail ignora folha externa, e boa parte deles ainda quebra com flex/grid.
export const enviarConfirmacaoLocacao = async ({
    para,
    nomeAluno,
    nomeEscola,
    armario,
    corredor,
    rotuloCorredor = 'Bloco',
    valor,
    modalidade,
    validoAte
}) => {
    if (!emailHabilitado()) return { ok: false, erro: 'sem_chave' };

    const periodo = modalidade === 'semestral' ? 'Semestral' : 'Anual';
    const linha = (rotulo, valorLinha) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #E4E7EC;color:#54617A;font-size:14px;">${escapar(rotulo)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #E4E7EC;color:#0A1F44;font-size:14px;font-weight:600;text-align:right;">${escapar(valorLinha)}</td>
        </tr>`;

    const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:#F4F6FA;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:10px;overflow:hidden;border:1px solid #E4E7EC;">
    <tr>
      <td style="background:#0A1F44;padding:22px 26px;">
        <div style="color:#FFFFFF;font-size:17px;font-weight:700;letter-spacing:.04em;">
          LOCK<span style="color:#E8B44A;font-weight:400;">UP</span>
        </div>
        <div style="color:#A9B4C9;font-size:12px;margin-top:3px;">${escapar(nomeEscola || 'Locação de armários')}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:26px;">
        <h1 style="margin:0 0 6px;font-size:19px;color:#0A1F44;">Seu armário está liberado</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#54617A;">
          ${escapar(nomeAluno || 'Olá')}, o pagamento foi confirmado e o armário
          <strong style="color:#0A1F44;">${escapar(armario)}</strong> já é seu até ${escapar(validoAte)}.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${linha('Armário', armario)}
          ${linha(rotuloCorredor, corredor)}
          ${linha('Período', periodo)}
          ${linha('Válido até', validoAte)}
          ${linha('Valor pago', formatarMoeda(valor))}
        </table>

        <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#54617A;">
          O cadeado é de sua responsabilidade. Retire seus pertences até
          ${escapar(validoAte)} — depois dessa data os armários são liberados
          para o período seguinte.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 26px;background:#F4F6FA;color:#8A94A6;font-size:11px;line-height:1.5;">
        Este e-mail é automático — não responda. Dúvidas sobre o armário devem
        ser tratadas na secretaria da instituição.
      </td>
    </tr>
  </table>
</body></html>`;

    return enviar({
        para,
        assunto: `Armário ${armario} liberado — ${nomeEscola || 'LockUp'}`,
        html
    });
};
