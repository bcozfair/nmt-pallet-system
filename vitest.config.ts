import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate from vite.config.ts on purpose. That file configures the dev server
// with `https: {}` and the basic-ssl plugin, neither of which a jsdom test run
// has any use for -- and vitest prefers this file when both exist, so the two
// never have to agree.
//
// No jest-dom. Its matchers (`toHaveAttribute`, `toBeInTheDocument`) need a
// global type augmentation, and this repo pins `types: ["node"]` in
// tsconfig.json -- so adding them means editing the compiler's type list for a
// convenience that `el.getAttribute(...)` already provides. Tests here assert
// on DOM properties directly.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
    test: {
        environment: 'jsdom',
        // Explicit imports (`import { describe, it, expect } from 'vitest'`)
        // rather than globals, for the same reason as above: globals would need
        // "vitest/globals" added to tsconfig's `types`.
        globals: false,
        include: ['**/*.test.{ts,tsx}'],
        exclude: ['node_modules/**', 'dist/**', 'supabase/**'],
        restoreMocks: true,
    },
});
