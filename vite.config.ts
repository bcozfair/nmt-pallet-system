import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * Stamps the built service worker with a content hash of the build output.
 *
 * public/sw.js ships a literal `__BUILD_ID__` in its cache name. Vite copies
 * public/ through untouched, so nothing else would ever change that string --
 * and a service worker whose bytes never change is a service worker the
 * browser never re-installs. The failure that causes is specific: sw.js
 * precaches '/' and '/index.html', and index.html points at hashed asset
 * files. Deploy again and those hashes change, but a device still holding the
 * old cache keeps a copy of the old index.html. The moment that device's
 * network hiccups, the fetch handler falls back to it and the app asks for
 * /assets/index-<old hash>.js, which no longer exists on the server. White
 * screen, and clearing it means the user knows how to unregister a worker.
 *
 * Hashing every emitted file (not a timestamp) keeps the id stable when the
 * build is: a rebuild that changes nothing leaves every device's cache alone
 * instead of making the whole warehouse re-download the shell.
 */
function stampServiceWorker(): Plugin {
  return {
    name: 'nmt-stamp-service-worker',
    apply: 'build',
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dirname, 'dist');
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;

      const hash = crypto.createHash('sha256');
      const walk = (dir: string) => {
        const entries = fs
          .readdirSync(dir, { withFileTypes: true })
          // Directory order is filesystem-dependent; sort so the same build
          // produces the same id on Windows, on CI and on a colleague's Mac.
          .sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
            continue;
          }
          // The worker cannot contribute to the id it is about to be given.
          if (full === swPath) continue;
          hash.update(path.relative(outDir, full).split(path.sep).join('/'));
          hash.update(fs.readFileSync(full));
        }
      };
      walk(outDir);
      const buildId = hash.digest('hex').slice(0, 8);

      const source = fs.readFileSync(swPath, 'utf8');
      if (!source.includes('__BUILD_ID__')) {
        this.warn(
          'sw.js has no __BUILD_ID__ placeholder -- the cache name is now ' +
            'frozen across deploys and stale shells will not be evicted.'
        );
        return;
      }
      fs.writeFileSync(swPath, source.replaceAll('__BUILD_ID__', buildId));
    },
  };
}

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
    plugins: [react(), basicSsl(), stampServiceWorker()],

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
