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

    build: {
      rollupOptions: {
        output: {
          // Recharts is only ever reached from the admin dashboard, and it is
          // heavy: it pulls @reduxjs/toolkit, react-redux, immer, reselect and
          // victory-vendor (d3-scale/shape/time) behind it. Left in the main
          // chunk it would be downloaded by everyone who lands on the sign-in
          // screen, including warehouse staff whose entire app is the mobile
          // scanner and who never see a chart.
          //
          // Splitting it out only helps in combination with the React.lazy()
          // boundaries around the dashboard sections -- this names the chunk,
          // the lazy import is what defers fetching it.
          manualChunks: {
            charts: ['recharts'],
            supabase: ['@supabase/supabase-js'],
          }
        }
      }
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
