import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this project from https://<user>.github.io/Poly-Post/,
  // so asset URLs need the repo name as a base path.
  base: '/Poly-Post/',
  plugins: [react()],
})
