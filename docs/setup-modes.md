# RooCode Project Setup Modes

RooCode supports two primary workflows to fit your needs:

## 1. Integrate RooCode into an Existing Project

**Who is this for?**

- You already have a project (any tech stack, monorepo or not) and want to add RooCode's workflow, rules, and LLM-powered automation.

**How it works:**

- The CLI analyzes your current codebase and tech stack.
- RooCode suggests a configuration and rules that fit your existing structure.
- No major refactors are suggested unless you opt in.
- You review and customize the suggested config, rules, and prompts before they are added.
- RooCode integrates with your current setup, respecting your existing conventions and files.

**Typical use cases:**

- Add LLM-powered workflow automation to a legacy or in-progress project.
- Adopt RooCode's best practices without starting from scratch.

**Planned Enhancements for Existing Project Integration:**

- Smarter project analysis (detect monorepo, DDD, NX, etc. and tailor config/rules accordingly)
- Warn if recommended files or structure are missing
- Context-aware rule/prompt generation (only suggest what fits the detected project type)
- User review and customization of all LLM suggestions before file generation
- Safe integration: never overwrite existing files without confirmation
- Validation: check that all referenced templates, rules, and prompts exist

---

## 2. Start a New Project with RooCode Best Practices

**Who is this for?**

- You want to create a new project and leverage RooCode's recommended structure, tech stack, and workflow from the beginning.

**How it works:**

- The CLI prompts you for high-level requirements (e.g., app type, preferred tech, scale).
- RooCode suggests a modern, scalable setup (e.g., NX monorepo, domain-driven design, frontend/backend separation, best practices).
- A starter project structure, configuration, and rules are generated for you.
- You can review and customize before finalizing.

**Typical use cases:**

- Quickly bootstrap a new project with proven architecture and automation.
- Ensure your new project follows scalable, maintainable patterns from day one.

---

## How to Choose

When you run the RooCode CLI, you'll be prompted to select one of these modes:

- **Integrate RooCode into an existing project**
- **Start a new project with RooCode best practices**

Choose the option that best fits your current needs. RooCode will guide you through the rest!
