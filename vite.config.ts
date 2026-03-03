import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Use an empty object to satisfy ServerOptions type if boolean causes issues,
      // or rely on basicSsl() plugin.
      // https: {} 
      // Actually, for Vite + basicSsl, having the plugin is often enough, 
      // but let's use the object form to be type-safe.
      https: {}
    },
    plugins: [react(), basicSsl()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
