import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import { nodeExternals } from 'rollup-plugin-node-externals';
import path from 'path';

export default defineConfig({
  plugins: [
    checker({ typescript: true }),
    {
      // Plugin to automatically externalize Node.js built-ins and dependencies
      ...nodeExternals({
        // Include dependencies and peerDependencies from package.json
        deps: true,
        peerDeps: true,
        devDeps: false, // Exclude devDependencies
      }),
      enforce: 'pre', // Ensure it runs before Vite's internal plugins
    },
  ],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@generators': path.resolve(__dirname, 'src/generators'),
      '@memory-bank': path.resolve(__dirname, 'src/memory-bank'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },
  build: {
    target: 'node16', // Align with package.json engines field
    outDir: 'dist',
    lib: {
      // Entry point for the library/CLI build
      entry: path.resolve(__dirname, 'src/core/cli/cli-main.ts'),
      // Name for the library (used in UMD/IIFE builds, less relevant for CJS/ES)
      name: 'RooCodeGenerator',
      // Output file names (without extension)
      fileName: 'roocode-generator',
      // Generate both CommonJS and ES module formats
      formats: ['cjs', 'es'],
    },
    rollupOptions: {
      // Although nodeExternals plugin handles most cases,
      // explicitly listing Node built-ins can prevent potential issues.
      external: [
        'fs',
        'path',
        'os',
        'crypto',
        'events',
        'stream',
        'util',
        'assert',
        'tty',
        'url',
        'http',
        'https',
        'zlib',
        '@langchain/anthropic',
        '@langchain/google-genai',
        '@langchain/openai',
        'ora',
        // Add any other Node built-ins used if necessary
      ],
      output: {
        // Preserve module structure for better code splitting and readability
        preserveModules: false, // Set to false for single file output per format
        // Ensure compatibility with Node.js require
        exports: 'auto',
      },
    },
    // Generate source maps for easier debugging
    sourcemap: true,
    // Minification is usually not needed for CLI tools, can disable to speed up build
    minify: false,
  },
  // Optimize dependency scanning for Node.js environment
  optimizeDeps: {
    // Prevent Vite from trying to optimize Node.js built-ins and CLI dependencies
    exclude: [
      'fs',
      'path',
      'os',
      'crypto',
      'events',
      'stream',
      'util',
      'assert',
      'tty',
      'url',
      'http',
      'https',
      'zlib',
      'ora', // Exclude ora from optimization to prevent interop issues
      'inquirer', // Exclude inquirer from optimization to prevent interop issues
      '@langchain/anthropic', // Exclude langchain packages to prevent ESM/CJS interop issues
      '@langchain/google-genai',
      '@langchain/openai',
    ],
    // Ensure proper interop between ESM and CommonJS modules
    esbuildOptions: {
      mainFields: ['module', 'main'],
      format: 'cjs',
    },
  },
  // Ensure Vite handles Node.js environment specifics correctly
  ssr: {
    // Ensure all dependencies are treated as external in SSR context (relevant for build)
    external: [
      'fs',
      'path',
      'os',
      'crypto',
      'events',
      'stream',
      'util',
      'assert',
      'tty',
      'url',
      'http',
      'https',
      'zlib',
    ],
    // Do not externalize dependencies that need to be processed by Vite
    noExternal: [
      // Add any dependency here if it needs Vite's processing (e.g., CSS-in-JS)
      // For a CLI, this is usually empty.
    ],
    // Target Node.js environment for SSR build
    target: 'node',
  },
});
