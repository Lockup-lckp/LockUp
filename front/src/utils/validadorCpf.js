/**
 * @param {string} cpf
 * @returns {boolean} 
 */
export const validarCPF = (cpf) => {
  if (!cpf) return false;

  let limpo = cpf.toString().replace(/[.\-\s]/g, '');

  limpo = limpo.replace(/x/i, '0');

  // CPF deve ter exatamente 11 dígitos numéricos
  if (limpo.length !== 11 || /^\d{11}$/.test(limpo) === false) {
    return false;
  }

  // Elimina CPFs com todos os números iguais conhecidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(limpo)) {
    return false;
  }

  const digitos = limpo.split('').map(Number);

  // --- 1º DÍGITO VERIFICADOR ---
  // Passo 1 e 2: Multiplica os 9 primeiros de 10 a 2 e soma
  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += digitos[i] * (10 - i);
  }
  // Passo 3 e 4: Multiplica por 10, divide por 11 e pega o resto
  let resto1 = (soma1 * 10) % 11;
  if (resto1 === 10 || resto1 === 11) resto1 = 0;

  // Verifica se o 1º dígito calculado bate com o do CPF
  if (resto1 !== digitos[9]) return false;

  // --- 2º DÍGITO VERIFICADOR ---
  // Passo 1 e 2: Multiplica os 10 primeiros (incluindo o 1º verificador) de 11 a 2 e soma
  let soma2 = 0;
  for (let i = 0; i < 10; i++) {
    soma2 += digitos[i] * (11 - i);
  }
  // Passo 3 e 4: Pega o resto da divisão por 11 (Nota: a multiplicação por 10 no passo 2 também se aplica aqui se seguir o padrão oficial brasileiro)
  let resto2 = (soma2 * 10) % 11;
  if (resto2 === 10 || resto2 === 11) resto2 = 0;

  // Verifica se o 2º dígito calculado bate com o do CPF
  if (resto2 !== digitos[10]) return false;

  return true;
};

/**
 * Aplica máscara de digitação em tempo real (000.000.000-00 ou aceitando X no final)
 * @param {string} valor - Valor bruto do input
 * @returns {string} - Valor formatado com pontos e traço
 */
export const aplicarMascaraCPF = (valor) => {
  // Remove tudo que não for número ou a letra X/x
  let v = valor.replace(/[^0-9Xx]/g, '');

  // Limita o tamanho máximo de caracteres
  if (v.length > 11) v = v.slice(0, 11);

  // Aplica a máscara personalizada por blocos
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})([\dXx]{1,2})$/, '$1-$2');

  return v;
};