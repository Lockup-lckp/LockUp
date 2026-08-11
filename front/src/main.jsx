import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { aplicarBloqueioZoom } from './theme/bloquearZoom.js'

aplicarBloqueioZoom()

// Quando um deploy sai com a aba do aluno aberta, os chunks antigos deixam de
// existir e o import dinâmico falha com um erro de MIME type incompreensível
// (o servidor devolve index.html no lugar do .js). Recarregar resolve, porque
// traz o index.html novo com os nomes de chunk atuais.
// O sessionStorage evita laço infinito caso a falha seja outra.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('lckp-recarregou-por-chunk')) return
  sessionStorage.setItem('lckp-recarregou-por-chunk', '1')
  window.location.reload()
})
window.addEventListener('load', () => sessionStorage.removeItem('lckp-recarregou-por-chunk'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
