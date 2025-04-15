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

## License
MIT
