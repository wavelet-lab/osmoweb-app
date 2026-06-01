import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
    plugins: [vue()],
    optimizeDeps: {
        exclude: [
            '@websdr/frontend-core',
            '@osmoweb/frontend-core',
        ],
    },
    server: {
        // allow overriding dev port via VITE_DEV_PORT or PORT env var
        port: Number(process.env.VITE_DEV_PORT || process.env.PORT) || 4000,
        headers: {
            // These headers enable SharedArrayBuffer and accurate performance.now().
            // Check window.crossOriginIsolated === true to confirm.
            // See also:
            // * https://web.dev/coop-coep/
            // * https://developer.chrome.com/blog/enabling-shared-array-buffer/
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
        },
        open: true,
        // Proxy API calls to backend (avoids CORS during local development).
        // The backend base should be set via VITE_API_URL in .env files.
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL || 'http://localhost:4000',
                changeOrigin: true,
                secure: false,
                configure(proxy) {
                    // Debug hooks: log backend response status and proxy errors to vite terminal
                    proxy.on('proxyRes', (proxyRes, req) => {
                        try {
                            const url = req.url || '';
                            // proxyRes.statusCode is the upstream status (e.g. 401). Log it.
                            // eslint-disable-next-line no-console
                            console.log(`[vite proxy] ${req.method} ${url} -> upstream ${proxyRes.statusCode}`);
                        } catch (e) {
                            // eslint-disable-next-line no-console
                            console.error('[vite proxy] failed to log proxy response', e);
                        }
                    });

                    proxy.on('error', (err, req, res) => {
                        // Log proxy errors so we can see if proxy is failing and returning 500.
                        // eslint-disable-next-line no-console
                        console.error('[vite proxy] proxy error:', err && err.stack ? err.stack : err);
                        try {
                            if (res && 'headersSent' in res && !res.headersSent) {
                                res.writeHead(502, { 'content-type': 'text/plain' });
                            }
                            res?.end('Proxy error');
                        } catch (e) {
                            // eslint-disable-next-line no-console
                            console.error('[vite proxy] failed to send error response', e);
                        }
                    });
                },
                ws: true,
            },
        },
        fs: {
            // Allow serving files from one level up to the project root (e.g. for shared types) just for development.
            allow: [
                '.',
                '../node_modules',
                '../../websdr/packages/frontend-core/dist',
                '../../osmoweb/packages/frontend-core/dist',
            ],
        },
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            external: [
                'http',
                'net',
                'fs',
                'dgram',
                'module',
            ],
        },
    },
    resolve: {
        alias: [
            {
                find: '@',
                replacement: srcPath,
            },
        ],
    },
});
