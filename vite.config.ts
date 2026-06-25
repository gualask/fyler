import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import transformImports from '@rolldown/plugin-transform-imports';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const host = process.env.TAURI_DEV_HOST;

const PDFJS_ASSET_DIRS = ['cmaps', 'iccs', 'standard_fonts', 'wasm'] as const;

type PdfJsAssetDir = (typeof PDFJS_ASSET_DIRS)[number];

interface PdfJsAssetRoute {
    directory: PdfJsAssetDir;
    route: string;
    sourceDir: string;
    files: string[];
    fileSet: Set<string>;
}

function contentTypeFor(fileName: string): string {
    switch (extname(fileName)) {
        case '.bcmap':
            return 'application/octet-stream';
        case '.icc':
            return 'application/vnd.iccprofile';
        case '.js':
            return 'text/javascript; charset=utf-8';
        case '.pfb':
            return 'application/octet-stream';
        case '.ttf':
            return 'font/ttf';
        case '.wasm':
            return 'application/wasm';
        default:
            return 'application/octet-stream';
    }
}

function createPdfJsAssetRoutes(): PdfJsAssetRoute[] {
    return PDFJS_ASSET_DIRS.map((directory) => {
        const sourceDir = fileURLToPath(
            new URL(`./node_modules/pdfjs-dist/${directory}/`, import.meta.url),
        );
        const files = existsSync(sourceDir) ? readdirSync(sourceDir) : [];
        return {
            directory,
            route: `/pdfjs/${directory}/`,
            sourceDir,
            files,
            fileSet: new Set(files),
        };
    });
}

function pdfJsAssets(): Plugin {
    const routes = createPdfJsAssetRoutes();

    return {
        name: 'fyler-pdfjs-assets',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
                const assetRoute = routes.find((route) => pathname.startsWith(route.route));
                if (!assetRoute) {
                    next();
                    return;
                }

                const fileName = decodeURIComponent(pathname.slice(assetRoute.route.length));
                if (!assetRoute.fileSet.has(fileName)) {
                    next();
                    return;
                }

                res.setHeader('Content-Type', contentTypeFor(fileName));
                res.setHeader('Cache-Control', 'no-cache');
                res.end(readFileSync(join(assetRoute.sourceDir, fileName)));
            });
        },
        generateBundle() {
            for (const assetRoute of routes) {
                for (const fileName of assetRoute.files) {
                    this.emitFile({
                        type: 'asset',
                        fileName: `pdfjs/${assetRoute.directory}/${fileName}`,
                        source: readFileSync(join(assetRoute.sourceDir, fileName)),
                    });
                }
            }
        },
    };
}

function vendorChunkName(moduleId: string): string | null {
    const id = moduleId.replaceAll('\\', '/');
    if (!id.includes('/node_modules/')) return null;
    if (id.includes('/node_modules/@dnd-kit/')) return 'dnd-vendor';
    if (id.includes('/node_modules/@tabler/')) return 'icons-vendor';
    if (id.includes('/node_modules/motion/')) return 'motion-vendor';
    if (id.includes('/node_modules/pdfjs-dist/')) return 'pdf-vendor';
    if (
        id.includes('/node_modules/react/') ||
        id.includes('/node_modules/react-dom/') ||
        id.includes('/node_modules/scheduler/')
    ) {
        return 'react-vendor';
    }
    return 'vendor';
}

// https://vite.dev/config/
export default defineConfig(async () => ({
    plugins: [
        pdfJsAssets(),
        transformImports({
            '@tabler/icons-react': {
                transform: '@tabler/icons-react/dist/esm/icons/{{member}}.mjs',
                preventFullImport: true,
            },
        }),
        tailwindcss(),
        react(),
    ],
    resolve: {
        tsconfigPaths: true,
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: vendorChunkName,
                            test: 'node_modules',
                        },
                    ],
                },
            },
        },
    },
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: 'ws',
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ['**/src-tauri/**'],
        },
    },
}));
