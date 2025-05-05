import { ProjectContext } from '../../src/core/analysis/types'; // Keep ProjectContext import
import { CodeInsights } from '../../src/core/analysis/ast-analysis.interfaces'; // Corrected CodeInsights import path

// Define partial type for overrides, excluding astData and making codeInsights optional
// Also allow partial overrides for nested structures
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

type ProjectContextOverrides = DeepPartial<Omit<ProjectContext, 'astData' | 'codeInsights'>> & {
  codeInsights?: CodeInsights;
};

export const createMockProjectContext = (
  overrides: ProjectContextOverrides = {}
): ProjectContext => {
  // Define the full default structure matching the types
  const defaultContextBase = {
    projectName: 'mock-project',
    // rootDir removed from here, belongs in structure
    techStack: {
      languages: ['typescript'],
      frameworks: ['jest'],
      tools: ['npm'],
      buildTools: [], // Added missing
      testingFrameworks: [], // Added missing
      linters: [], // Added missing
      packageManager: 'npm', // Added missing
    },
    structure: {
      rootDir: '/mock/root', // Added missing rootDir here
      sourceDir: 'src', // Added missing
      testDir: 'tests', // Added missing
      configFiles: ['package.json'], // Added missing
      mainEntryPoints: ['src/index.ts'], // Added missing
      componentStructure: {}, // Added missing
      directories: ['src', 'tests'], // Kept existing
      files: ['package.json', 'src/index.ts'], // Kept existing
    },
    dependencies: {
      dependencies: { jest: '^29.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      peerDependencies: {}, // Added missing
      internalDependencies: {}, // Added missing
    },
    codeInsights: {}, // Default empty object for codeInsights
  };

  // Deep merge defaults with overrides (simple merge for this example)
  // A proper deep merge function might be needed for more complex overrides
  const mergedContext = {
    ...defaultContextBase,
    ...overrides,
    techStack: { ...defaultContextBase.techStack, ...overrides.techStack },
    structure: { ...defaultContextBase.structure, ...overrides.structure },
    dependencies: { ...defaultContextBase.dependencies, ...overrides.dependencies },
    codeInsights: overrides.codeInsights ?? defaultContextBase.codeInsights,
  };

  const finalContext: ProjectContext = {
    techStack: mergedContext.techStack as ProjectContext['techStack'],
    structure: mergedContext.structure as ProjectContext['structure'],
    dependencies: mergedContext.dependencies as ProjectContext['dependencies'],
    codeInsights: mergedContext.codeInsights,
  };

  return finalContext;
};

// Example of a default mock instance if needed
export const mockProjectContext = createMockProjectContext();
