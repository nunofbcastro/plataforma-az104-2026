import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/plataforma-az104-2026/' : '/',
  plugins: [react(), tailwindcss()]
}));
