# Task Description: Implement CLI Bootstrap and Update Vite Config

## Summary

Implement a dedicated bootstrap file for the CLI to ensure proper execution flow after bundling, and update the Vite configuration to use this new file as the build entry point. This addresses the issue where the bundled CLI code is present but not automatically executed when the `bin/roocode-generator.js` launcher script is run.

## Functional Requirements

- The CLI should execute correctly when run via `npm start` after building.
- The `generate` command with `--generators ai-magic` should be recognized and the placeholder logic within the new bootstrap file should be reached (e.g., printing "Running generators: ai-magic").

## Technical Requirements

- Create a new file `src/core/cli/cli-main.ts`.
- This file should import `CliInterface` and `createPromptModule`.
- It should contain an asynchronous `main` function that:
  - Instantiates `CliInterface`, injecting `createPromptModule()`.
  - Calls `cli.parseArgs()`.
  - Retrieves parsed arguments using `cli.getParsedArgs()`.
  - Includes placeholder logic to demonstrate command recognition (e.g., checking `parsedArgs.command` and logging).
- The `main` function should be called at the end of the file, with error handling.
- Update `vite.config.ts` to change the `build.lib.entry` path to `src/core/cli/cli-main.ts`.
- Ensure the existing build configuration (externalization, formats, etc.) remains compatible with the new entry point.

## Constraints

- Do not modify `src/core/cli/cli-interface.ts` itself.
- Do not modify `bin/roocode-generator.js`.
- The solution must use the existing Vite build setup.

## Success Criteria

- Running `npm run build` completes without errors.
- Running `npm start -- generate -- --generators ai-magic` executes the code in `cli-main.ts` and prints the expected output (e.g., "Running generators: ai-magic").

## Related Documentation

- `vite.config.ts`
- `bin/roocode-generator.js`
- `src/core/cli/cli-interface.ts`
- `package.json` (for build and start scripts)
- memory-bank/TechnicalArchitecture.md (for build process details)
- memory-bank/DeveloperGuide.md (for development workflow)

## Timeline

- This task should be completed promptly to unblock further generator development.

## Memory Bank Updates

- Document the creation of `cli-main.ts` and the update to `vite.config.ts` in `memory-bank/TechnicalArchitecture.md`.
