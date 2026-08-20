import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Ativa o Tailwind no compilador do Vite
  ],
  server: {
    // O portal resolve a escola pelo SUBDOMÍNIO, e localhost não tem subdomínio.
    // lvh.me resolve *.lvh.me para 127.0.0.1 no DNS público, então
    // `etec-043.lvh.me:5173` chega até aqui sem mexer no arquivo hosts.
    //
    // Sem esta lista o Vite responde 403 a qualquer Host que não seja localhost
    // — é a proteção dele contra DNS rebinding. Liberamos só o domínio de teste.
    allowedHosts: ['localhost', '.lvh.me', '.localtest.me'],
  },
})
