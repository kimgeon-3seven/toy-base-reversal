import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'itch' ? './' : '/toy-base-reversal/',
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
}));
