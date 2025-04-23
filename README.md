# RooCode Generator

A CLI tool to generate RooCode workflow configuration files for any tech stack or project structure.

## Features

- Interactive CLI for custom workflow setup
- Supports config file import/export for repeatable runs
- Generates all RooCode config, rules, system prompts, and memory bank files
- Flexible: works with any frontend, backend, or architecture

## Installation

```bash
npm install -g roocode-generator
```

Or use with npx (no install required):

```bash
npx roocode-generator
```

## Usage

```bash
roocode-generator
```

- Answer the prompts to generate your configuration
- Or use a saved `roocode.config.json` for non-interactive setup

## Project Structure

- `bin/` - CLI entry point
- `generators/` - File generation logic
- `templates/` - All templates for rules, system prompts, memory bank, etc.

## Trunk-Based Development & Release Automation

This project follows **trunk-based development**:

- All changes are merged to the `main` branch.
- Feature branches are short-lived and merged via PRs.
- Releases are created by tagging the main branch (e.g., `v1.0.0`).
- CI enforces lint, format, and commit message rules before merging.
- Automated publishing to npm and GitHub Releases on new version tags.

### Enforced Rules

- **Linting & Formatting:** All code must pass ESLint and Prettier checks (enforced locally via Husky and in CI).
- **Conventional Commits:** All commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced via commitlint).
- **CI Checks:** PRs and pushes to main run full CI (lint, format, test).
- **No direct pushes to main:** Use PRs for all changes.

### Semantic Versioning

This project uses [Semantic Versioning](https://semver.org/):

- Use `npm version patch|minor|major` to bump the version.
- Tagging with `v*` triggers automated npm publish and GitHub Release.
- (Optional) You can install [semantic-release](https://github.com/semantic-release/semantic-release) for fully automated versioning and changelogs.

#### To install semantic-release:

```bash
npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/npm @semantic-release/github
```

Add a `.releaserc.json` or update your workflow for semantic-release (see their docs).

### Release Process

1. Make sure your branch is up to date with `main`.
2. Run all tests and lint checks locally.
3. Merge your feature branch to `main` via PR.
4. Bump the version and tag:
   ```bash
   npm version patch   # or minor/major
   git push --follow-tags
   ```
5. CI will:
   - Run lint, format, and tests
   - Publish to npm (if NPM_TOKEN is set)
   - Create a GitHub Release with notes

---

## Comprehensive Test Case: LLM-Powered Auto-Detect Workflow

Follow these steps to test the full LLM-powered project analysis and configuration workflow:

### 1. Set Up LLM Provider and API Key

```bash
npx roocode-llm-config
```

- Select your preferred LLM provider (OpenAI, Google Gemini, or Anthropic).
- Enter your API key when prompted.

### 2. Run the RooCode Generator CLI

```bash
npx roocode-generator
```

- When prompted, choose **auto-detect mode** (press Enter for default).
- The CLI will analyze your project using the selected LLM. This may take a moment.

### 3. Review LLM-Generated Project Config

- The CLI will display a summary and the auto-detected configuration.
- Review the suggested config values (domains, tiers, tech stack, etc.).
- If you want to edit any values, type `n` when prompted and proceed with the interactive setup.
- Otherwise, confirm to proceed with the auto-detected config.

### 4. Generate RooCode Workflow Files

- The CLI will generate all configuration, rules, system prompts, and memory bank files based on the selected config.
- Check the `.roo/` and `memory-bank/` folders for the generated files.

### 5. (Optional) Export/Import Config

- After setup, you can export your config for future use.
- To reuse a config, place `roocode.config.json` in your project root and follow the prompts.

### 6. Troubleshooting

- If the LLM fails or does not return a valid config, the CLI will fall back to interactive mode.
- Ensure your API key is valid and you have network access.
- For large projects, the LLM may truncate file contents—review the prompt and adjust as needed.

---

**Tip:** You can repeat this process with different LLM providers or project structures to compare results and tune your workflow.

---

## Local Development

- Run `npm run lint` and `npm run format` before committing.
- Use `npm run format:write` to auto-format your code.
- Commit messages must follow Conventional Commits (enforced by Husky/commitlint).

## Contributing

- Fork the repo and create a feature branch.
- Follow trunk-based development and commit message rules.
- Open a PR to `main`.

---

## License

MIT
