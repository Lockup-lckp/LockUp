import 'dotenv/config';
import { conferirAmbiente } from './utils/conferirAmbiente.js';

// Antes de qualquer import que use as variáveis: o que falta e é essencial
// derruba aqui, com o nome da variável, em vez de estourar mais tarde num
// ponto que não deixa claro qual configuração está faltando.
conferirAmbiente();

const { default: app } = await import('./app.js');

const PORT = process.env.PORT || 3000;

async function iniciar() {
    try {
        console.log('[SISTEMA] Conectando ao ecossistema do Supabase via SDK...');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
            console.log(`🔗 API base activa em: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Falha crítica ao iniciar o servidor backend:', error);
        process.exit(1);
    }
}

iniciar();