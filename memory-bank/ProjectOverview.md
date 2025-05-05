# Project Overview

<!-- This is a fallback template generated automatically on 2025-04-27 -->

## Overview

This project, named "roocode-generator", is a command-line interface (CLI) tool designed to analyze code repositories and generate various types of documentation or configuration files based on the project's structure and content. It leverages Large Language Models (LLMs) to understand code context and generate relevant output. The tool utilizes a modular architecture with a dependency injection container for managing services. Key functionalities include project analysis using AST parsing, file collection and prioritization, and interaction with various LLM providers (OpenAI, Google GenAI, Anthropic, OpenRouter) through a unified interface. It provides different "generators" for specific tasks, such as generating documentation (memory bank), system prompts, or configuration files (like VSCode Copilot rules).

## Goals

*   **Automate Code Analysis:** To provide a tool that can automatically analyze the structure and content of a codebase.
*   **Generate Contextually Relevant Output:** To leverage LLMs to generate documentation, configuration, or other desired outputs based on the analyzed code context.
*   **Support Multiple Output Formats:** To offer different "generators" for creating various types of files.
*   **Provide a Flexible and Extensible Architecture:** To use a modular design with dependency injection, allowing for easy addition of new features and generators.
*   **Offer a User-Friendly CLI:** To provide a simple and intuitive command-line interface for interacting with the tool.
*   **Support Multiple LLM Providers:** To allow users to utilize different LLM services based on their preferences and needs.

## Scope

The project's scope includes:

*   Analyzing JavaScript and TypeScript codebases.
*   Collecting and prioritizing files within a project based on defined rules.
*   Parsing code using Tree-Sitter to build Abstract Syntax Trees (ASTs).
*   Interacting with configured LLM providers to process code context and generate output.
*   Providing built-in generators for common tasks (memory bank, system prompts, VSCode Copilot rules).
*   Managing LLM configuration through the CLI.
*   Handling errors and providing informative feedback to the user.

The project does *not* currently include:

*   Support for languages other than JavaScript and TypeScript (though the architecture is designed to be extensible).
*   Advanced code refactoring or modification capabilities (focus is on generation).
*   A graphical user interface (GUI).

## Stakeholders

*   **Developers:** The primary target audience who will use the tool to generate documentation, configuration, or other code-related content.
*   **Technical Writers:** Who can potentially use the tool to automate parts of the documentation process.
*   **Project Maintainers:** Who benefit from automated documentation and consistent configuration generation.
*   **LLM Providers:** The services integrated with the tool (OpenAI, Google GenAI, Anthropic, OpenRouter).

## Timeline

A detailed project timeline is not available in the provided context. However, based on the code structure and features, it appears to be an ongoing project with a focus on iterative development and adding new functionalities and generators over time. Potential future milestones could include:

*   Adding support for more programming languages.
*   Developing new generators for different use cases.
*   Improving the project analysis and AST processing capabilities.
*   Enhancing error handling and reporting.
*   Further streamlining the CLI experience.