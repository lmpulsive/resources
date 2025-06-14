import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // server: {
  //   port: 3000 // Optional: if you want to specify the dev server port
  // },
  // build: {
  //   outDir: 'dist' // Optional: specify output directory
  // }
})
