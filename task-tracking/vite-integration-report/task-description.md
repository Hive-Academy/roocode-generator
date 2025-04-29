# Vite Integration Report

## Introduction

This report details the integration of Vite for handling all TypeScript bundling and building within our application. Vite leverages esbuild to provide exceptionally fast builds, supports Hot Module Replacement (HMR), and offers an improved developer experience compared to traditional bundlers. Its capabilities make it an ideal choice for our TypeScript project, especially as we aim to streamline our CI/CD workflows and enhance npm package publishing.

## Prerequisites

- **Node.js:** Version 14.x or higher (preferably the latest LTS version)
- **npm:** Version 6.x or higher
- **Dependencies:**
  - Vite (`vite`)
  - Type-checking plugin: `vite-plugin-checker`

**Installation:**

```bash
npm install --save-dev vite vite-plugin-checker
```

## Integration Steps

1. **Installation & Setup:**

   - Install Vite and vite-plugin-checker as development dependencies.
   - Ensure your TypeScript configuration (`tsconfig.json`) is up to date.

2. **Vite Configuration:**

   - Create a `vite.config.ts` file in the project root with module aliasing and appropriate build settings.
   - Sample configuration snippet:

   ```typescript
   import { defineConfig } from 'vite';
   import checker from 'vite-plugin-checker';

   export default defineConfig({
     plugins: [checker({ typescript: true })],
     build: {
       lib: {
         entry: 'src/index.ts',
         name: 'MyLibrary',
         fileName: (format) => `my-library.${format}.js`,
       },
       rollupOptions: {
         // Exclude dependencies that should remain external
         external: ['some-external-dependency'],
       },
     },
     resolve: {
       alias: {
         '@': '/src',
       },
     },
   });
   ```

3. **Package Scripts Update:**

   - Modify `package.json` scripts to integrate Vite workflows:

   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build && tsc --noEmit",
       "type-check": "tsc --noEmit"
     }
   }
   ```

   - Remove legacy module aliasing configurations if applicable.

4. **TypeScript Checking:**
   - Enhance development and production flows with integrated type-checking.
   - Options include:
     - Running `tsc --noEmit` as part of build processes.
     - Using `vite-plugin-checker` to report errors directly in the browser during development.

## CI Pipeline Enhancements

- **Integration into CI/CD:**
  - Update your CI configuration (e.g., `.github/workflows/nodejs.yml`) to include Vite build and type-check steps.
  - Recommended CI steps:
    1. **Install Dependencies:** Cache npm modules.
    2. **Build:** Execute `vite build` followed by `tsc --noEmit` to ensure type correctness.
    3. **Test:** Run unit and integration tests after successful builds.
  - This approach accelerates the build process and improves feedback cycles for reliable npm package publishing.

## Troubleshooting & Best Practices

- **Common Pitfalls:**
  - Misconfiguration of module aliases can lead to unexpected build errors.
  - Ensure non-standard dependencies are properly externalized in `rollupOptions`.
- **Recommendations:**
  - Regularly update Vite and associated plugins to benefit from performance improvements and bug fixes.
  - Consult the following resources for further guidance:
    - [Vite Official Documentation (Features)](https://vite.dev/guide/features)
    - [Vite Official Documentation (Build)](https://vite.dev/guide/build)
    - DEV Community article: “Mastering NPM Library Creation: Bundling with Vite”
    - Blog post: “Creating a TypeScript Package with Vite” by Onur Önder
    - GitHub repository: [jasonsturges/vite-typescript-npm-package](https://github.com/jasonsturges/vite-typescript-npm-package)

_Document updated to reflect new configuration changes, CI pipeline enhancements, and the streamlined process for npm package publishing._
