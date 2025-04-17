---
title: Project Overview
version: 1.0.0
lastUpdated: 2023-10-27 # Placeholder - Update with current date
type: core-documentation
category: overview
---

# roocode-generator

## Overview

A CLI tool built with Node.js and TypeScript to generate RooCode workflow configuration files. It uses LangChain to integrate with LLMs (OpenAI, Google Genai, Anthropic) for project analysis and automated configuration suggestions. Features interactive prompts (inquirer), template-based file generation, and support for creating memory banks, rules, system prompts, and VS Code Copilot configurations.

## Project Essentials

- **Status**: Active Development
- **Version**: 1.0.0
- **Phase**: Development
- **Start Date**: Not specified

## Purpose and Goals

To simplify and automate the creation of RooCode workflow configuration files by leveraging Large Language Models (LLMs) via LangChain for intelligent suggestions and project analysis, guided by user interaction through a command-line interface.

## Core Features

- Command-Line Interface (CLI) for user interaction.
- Generates RooCode workflow configuration files.
- Integrates with LLMs (OpenAI, Google Genai, Anthropic) using LangChain.
- Performs project analysis using LLMs.
- Provides automated configuration suggestions.
- Uses interactive prompts (via Inquirer) for configuration guidance.
- Employs template-based file generation.
- Supports the creation/configuration of:
  - Memory banks
  - Rules
  - System prompts
  - VS Code Copilot configurations

## Project Structure

### Technology Overview

See [[TechnicalArchitecture#Stack]] for detailed technical specifications.

- **Primary Stack**: Node.js, TypeScript, LangChain (integrating OpenAI, Google Genai, Anthropic), Inquirer, Chalk.
- **Development Flow**: Trunk-based development (main branch releases) using conventional commits, with automated releases managed by Semantic Release.

### Team and Organization

- **Team Structure**: Not specified
- **Key Stakeholders**: Not specified

## Project Status

Current state and next steps. See [[DevelopmentStatus]] for detailed progress.

### Active Development

- **Current Focus**: Implementation of core generation features and LLM integration for configuration suggestions.
- **Next Milestone**: First stable release with core functionality for generating basic RooCode configurations.

### Known Constraints

- Currently lacks automated tests (placeholder test script exists). Development relies on manual testing.

## Documentation Index

### Core Documentation

- Technical Details: [[TechnicalArchitecture]]
- Developer Setup: [[DeveloperGuide]]
- Development Status: [[DevelopmentStatus]]

### Process Templates

- Implementation Plans: [[templates/implementation-plan-template]]
- Task Descriptions: [[templates/task-description-template]]
- Completion Reports: [[templates/completion-report-template]]
