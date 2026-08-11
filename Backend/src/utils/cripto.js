import crypto from 'crypto';

// Cifragem simétrica das credenciais de gateway guardadas no banco.
//
// Por que existe: a credencial do PagBank é da conta da PRÓPRIA escola. Se o
// banco vazar, um token em texto puro permite movimentar a conta da instituição.
// AES-256-GCM porque, além de cifrar, ele autentica: um registro adulterado
// falha na decifragem em vez de devolver lixo silenciosamente.
//
// A chave vem de CREDENCIAIS_SECRET (32 bytes em hexadecimal, 64 caracteres).
// Gerar uma com:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

const ALGORITMO = 'aes-256-gcm';
const TAMANHO_IV = 12; // 96 bits, recomendado para GCM

const obterChave = () => {
    const bruta = process.env.CREDENCIAIS_SECRET;
    if (!bruta) {
        throw new Error(
            'CREDENCIAIS_SECRET não configurado. Sem ele não é possível guardar credenciais de gateway com segurança.'
        );
    }
    const chave = Buffer.from(bruta, 'hex');
    if (chave.length !== 32) {
        throw new Error('CREDENCIAIS_SECRET precisa ter 32 bytes em hexadecimal (64 caracteres).');
    }
    return chave;
};

// Devolve uma string única "iv:tagDeAutenticacao:textoCifrado", toda em hex,
// para caber numa coluna TEXT sem precisar de três campos separados.
export const cifrar = (textoPuro) => {
    if (textoPuro === null || textoPuro === undefined || textoPuro === '') return null;

    const iv = crypto.randomBytes(TAMANHO_IV);
    const cifrador = crypto.createCipheriv(ALGORITMO, obterChave(), iv);

    const cifrado = Buffer.concat([
        cifrador.update(String(textoPuro), 'utf8'),
        cifrador.final()
    ]);

    return [
        iv.toString('hex'),
        cifrador.getAuthTag().toString('hex'),
        cifrado.toString('hex')
    ].join(':');
};

export const decifrar = (pacote) => {
    if (!pacote) return null;

    const partes = String(pacote).split(':');
    if (partes.length !== 3) {
        throw new Error('Credencial cifrada em formato inválido.');
    }

    const [ivHex, tagHex, cifradoHex] = partes;
    const decifrador = crypto.createDecipheriv(
        ALGORITMO,
        obterChave(),
        Buffer.from(ivHex, 'hex')
    );
    decifrador.setAuthTag(Buffer.from(tagHex, 'hex'));

    return Buffer.concat([
        decifrador.update(Buffer.from(cifradoHex, 'hex')),
        decifrador.final()
    ]).toString('utf8');
};

// Para exibir na interface do superadmin sem revelar o segredo: mostra apenas
// os últimos 4 caracteres, o suficiente para conferir QUAL credencial está lá.
export const mascarar = (textoPuro) => {
    if (!textoPuro) return null;
    const texto = String(textoPuro);
    return `••••${texto.slice(-4)}`;
};

// ---------------------------------------------------------------------
// Credencial como conjunto de campos
// ---------------------------------------------------------------------
// Cada gateway precisa de coisas diferentes: o PagBank de um token, o Banco do
// Brasil de client_id + client_secret + convênio. Guardar um OBJETO cifrado, em
// vez de uma coluna por campo, é o que faz um banco novo não exigir migração.
//
// A cifragem é a mesma: o objeto vira JSON e esse texto é cifrado inteiro. Não
// há chave em claro no banco — nem os NOMES dos campos vazam.

export const cifrarCredenciais = (objeto) => {
    if (!objeto || typeof objeto !== 'object') return null;

    // Campo vazio significa "não informado" e não deve ocupar espaço no pacote:
    // senão um formulário com metade dos campos em branco gravaria strings
    // vazias que o adaptador leria como se fossem credencial de verdade.
    const limpo = {};
    for (const [chave, valor] of Object.entries(objeto)) {
        if (valor === null || valor === undefined) continue;
        const texto = String(valor).trim();
        if (texto) limpo[chave] = texto;
    }

    if (Object.keys(limpo).length === 0) return null;
    return cifrar(JSON.stringify(limpo));
};

// Devolve SEMPRE um objeto — nunca null — para quem chama poder ler
// `credenciais.token` sem checar antes.
export const decifrarCredenciais = (pacote) => {
    if (!pacote) return {};

    let texto;
    try {
        texto = decifrar(pacote);
    } catch {
        // Causa quase certa: CREDENCIAIS_SECRET diferente do que cifrou (o caso
        // clássico é subir o backend noutro servidor com chave nova). Melhor
        // falhar com essa frase do que devolver {} e a cobrança sair sem
        // credencial, dando um erro incompreensível lá no gateway.
        throw new Error(
            'Não foi possível decifrar as credenciais do gateway. Confira se CREDENCIAIS_SECRET é o mesmo que gravou a credencial.'
        );
    }

    try {
        const objeto = JSON.parse(texto);
        return objeto && typeof objeto === 'object' ? objeto : {};
    } catch {
        // Formato antigo: o PagBank guardava o token puro, sem JSON à volta.
        // Entender os dois é o que permite migrar sem janela de indisponibilidade.
        return { token: texto };
    }
};
