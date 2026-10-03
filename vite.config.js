import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// host: true permite abrir no celular pela rede local durante os testes
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true },
})
