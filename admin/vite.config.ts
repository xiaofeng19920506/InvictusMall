import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Vite automatically loads .env files from the project root
// Variables prefixed with VITE_ are exposed to client code via import.meta.env
export default defineConfig({
  plugins: [react()],
  // Vite automatically loads .env files, but we can explicitly set the prefix
  envPrefix: 'VITE_',
})
