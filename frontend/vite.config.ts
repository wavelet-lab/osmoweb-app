import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig(({mode}) => {
    const devMode = mode === 'development';
    console.log(devMode ? 'Development mode' : 'Production mode');
    return {
        plugins: [
            vue(),
            VitePWA({
                devOptions: {
                    enabled: devMode,
                    navigateFallback: 'index.html',
                    type: 'module',
                },
                workbox: {
                    skipWaiting: true,
                    clientsClaim: true,
                    cleanupOutdatedCaches: true,
                    globPatterns: ['**/*.{css,js,html,wasm,svg,png}'],
                    maximumFileSizeToCacheInBytes: Number.MAX_SAFE_INTEGER,
                    navigateFallback: '/index.html',
                    navigateFallbackDenylist: [
                        /^\/api(?:\/|$)/,
                    ],
                    runtimeCaching: [
                        {
                            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                            handler: 'NetworkOnly',
                        },
                    ],
                },
                registerType: 'autoUpdate',
                injectRegister: 'auto',
                filename: 'claims-sw.js',
                includeAssets: [
                    'favicon.svg',
                    'pwa-icon.svg',
                    'pwa-maskable-icon.svg',
                    'pwa-icon-192.png',
                    'pwa-icon-512.png',
                    'pwa-maskable-icon-512.png',
                ],
                manifest: {
                    name: 'OsmoWeb Application',
                    short_name: 'OsmoWeb',
                    description: 'OsmoWeb application',
                    start_url: '/',
                    scope: '/',
                    display: 'standalone',
                    background_color: '#0b1220',
                    theme_color: '#0f766e',
                    icons: [
                        {
                            src: '/pwa-icon-192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any',
                        },
                        {
                            src: '/pwa-icon-512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any',
                        },
                        {
                            src: '/pwa-maskable-icon-512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                        },
                    ],
                },
            }),
        ],
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
    }
});
