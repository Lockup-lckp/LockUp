// Conferência das variáveis de ambiente na partida.
//
// Por que existe: as variáveis que faltam não quebram o servidor — elas
// quebram UM fluxo, mais tarde, em silêncio. MP_WEBHOOK_SECRET ausente faz o
// webhook do Mercado Pago rejeitar toda notificação: o aluno paga, o dinheiro
// entra e o armário não abre. Descobrir isso pelo aluno é o pior caminho.
//
// A separação importa. O que falta e impede o serviço de existir derruba o
// processo; o que falta e apenas desliga um pedaço vira aviso na partida, para
// quem sobe o serviço ver e decidir.

const FATAIS = {
    SUPABASE_URL: 'endereço do projeto no Supabase — sem ele não há banco de dados',
    SUPABASE_SERVICE_ROLE_KEY: 'chave de serviço do Supabase',
    JWT_SECRET: 'segredo que assina os tokens de sessão'
};

const IMPORTANTES = {
    CREDENCIAIS_SECRET:
        'sem ela nenhuma credencial de gateway pode ser salva ou lida (painel do superadmin fica inutilizável)',
    BACKEND_PUBLIC_URL:
        'sem ela os gateways não recebem URL de notificação — o aluno paga e o armário não abre',
    MP_WEBHOOK_SECRET:
        'sem ele o webhook do Mercado Pago REJEITA toda notificação; escolas nesse gateway não liberam armário',
    RESEND_API_KEY:
        'sem ela o e-mail de confirmação de locação não é enviado (o resto do fluxo segue normal)'
};

export const conferirAmbiente = () => {
    const faltandoFatais = Object.entries(FATAIS)
        .filter(([nome]) => !process.env[nome]);

    if (faltandoFatais.length) {
        console.error('\n[LCKP] O serviço NÃO pode subir. Faltam variáveis essenciais:');
        for (const [nome, porque] of faltandoFatais) {
            console.error(`  ✗ ${nome} — ${porque}`);
        }
        console.error('');
        process.exit(1);
    }

    // CREDENCIAIS_SECRET com formato errado é pior que ausente: só falha na
    // hora de cifrar, com um erro que não aponta para a variável.
    if (process.env.CREDENCIAIS_SECRET && !/^[0-9a-fA-F]{64}$/.test(process.env.CREDENCIAIS_SECRET)) {
        console.warn(
            '[LCKP] ! CREDENCIAIS_SECRET não tem 32 bytes em hexadecimal (64 caracteres). ' +
            'A cifragem das credenciais vai falhar.'
        );
    }

    const faltandoImportantes = Object.entries(IMPORTANTES)
        .filter(([nome]) => !process.env[nome]);

    if (faltandoImportantes.length) {
        console.warn('\n[LCKP] Variáveis ausentes — estes fluxos ficam desligados:');
        for (const [nome, consequencia] of faltandoImportantes) {
            console.warn(`  ! ${nome} — ${consequencia}`);
        }
        console.warn('');
    }

    return { fatais: faltandoFatais.length, avisos: faltandoImportantes.length };
};
