import 'dotenv/config'; 
import app from './app.js';
import supabase from './config/database.js';

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