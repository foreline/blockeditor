import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
    const isLibrary = mode === 'library';
    
    const baseConfig = {
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        server: {
            port: 5173,
            open: true,
            // Generated reports/builds must not reload pages under test or
            // attach Windows file watchers to files being replaced by a build.
            watch: {
                ignored: ['**/coverage/**', '**/dist/**', '**/demo-dist/**', '**/test-results/**', '**/playwright-report/**'],
            },
        },
    };

    if (isLibrary) {
        // Library build configuration
        return {
            ...baseConfig,
            build: {
                lib: {
                    entry: path.resolve(__dirname, 'src/index.js'),
                    name: 'BlockEditor',
                    formats: ['es', 'cjs', 'iife'],
                    fileName: (format) => `blockeditor.${format}.js`
                },
                rollupOptions: {
                    // Keep dependencies external
                    external: [
                        '@fortawesome/fontawesome-free',
                        'prismjs',
                        'showdown'
                    ],
                    output: {
                        exports: 'named',
                        globals: {
                            '@fortawesome/fontawesome-free': 'FontAwesome',
                            'prismjs': 'Prism',
                            'showdown': 'showdown'
                        }
                    }
                },
                sourcemap: true,
                minify: 'esbuild',
                outDir: 'dist',
                emptyOutDir: true,
                copyPublicDir: false,
                cssCodeSplit: false
            },
            define: {
                // Ensure we're building for production
                'process.env.NODE_ENV': '"production"'
            }
        };
    }

    // Demo/development build configuration
    return {
        ...baseConfig,
        build: {
            outDir: 'demo-dist',
            assetsDir: 'assets',
            sourcemap: true
        }
    };
});
