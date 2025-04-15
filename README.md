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
