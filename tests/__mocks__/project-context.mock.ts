import { ProjectContext } from '../../src/core/analysis/types'; // Keep ProjectContext import
import { CodeInsights } from '../../src/core/analysis/ast-analysis.interfaces'; // Corrected CodeInsights import path

// Define partial type for overrides, excluding astData and making codeInsights optional
// Also allow partial overrides for nested structures
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;
// Keep the standard CodeInsights map type
type CodeInsightsMap = { [filePath: string]: CodeInsights };

// Define overrides, separating standard map from non-standard properties
type ProjectContextOverrides = DeepPartial<Omit<ProjectContext, 'astData' | 'codeInsights'>> & {
  // Override for the standard file path -> CodeInsights map
  codeInsightsMap?: CodeInsightsMap;
  // Separate overrides for properties accessed via `(as any)` in implementation
  _implementation_projectSummary?: string;
  _implementation_components?: Array<{
    name: string;
    summary: string;
    path?: string;
    details?: any;
  }>;
};

// Define reusable default code insights map
const defaultMockCodeInsightsMap: { [filePath: string]: CodeInsights } = {
  'src/components/Button.ts': {
    functions: [{ name: 'handleButtonClick', parameters: ['event'] }],
    classes: [{ name: 'Button' }],
    imports: [{ source: 'react' }],
  },
  'src/utils/math.ts': {
    functions: [{ name: 'calculateTotal', parameters: ['items'] }],
    classes: [],
    imports: [],
  },
  'src/services/api.ts': {
    functions: [],
    classes: [{ name: 'ApiService' }],
    imports: [{ source: 'axios' }],
  },
};

export const createMockProjectContext = (
  overrides: ProjectContextOverrides = {}
): ProjectContext => {
  // Define the full default structure matching the types
  const defaultContextBase = {
    projectName: 'mock-project',
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
    // Default standard codeInsights map
    codeInsights: defaultMockCodeInsightsMap,
  };

  // --- Merging Logic ---

  // 1. Merge base properties (excluding codeInsights initially)
  const mergedBase = {
    ...defaultContextBase,
    ...overrides, // Apply top-level overrides (like projectName)
    techStack: { ...defaultContextBase.techStack, ...overrides.techStack },
  };

  // 2. Create the final codeInsights object (map part) for the mock context
  const finalCodeInsightsMap: CodeInsightsMap = {
    ...defaultMockCodeInsightsMap, // Start with default map
    ...(overrides.codeInsightsMap ?? {}), // Merge overrides for the map
  };

  // 3. Determine and add the non-standard properties (accessed via `as any` in implementation)
  // Check if the override property exists, even if its value is undefined
  const summaryToAdd =
    '_implementation_projectSummary' in overrides
      ? overrides._implementation_projectSummary // Use the override value (could be undefined)
      : 'Default Mock Project Summary'; // Use default only if override property is absent

  const componentsToAdd =
    '_implementation_components' in overrides
      ? overrides._implementation_components // Use the override value (could be undefined or [])
      : [
          // Use default only if override property is absent
          { name: 'DefaultButton', summary: 'Default button component summary' },
          { name: 'DefaultModal', summary: 'Default modal component summary' },
        ];

  // Add these properties directly to the map object that will be used at runtime
  // This object now has both the map structure and the extra properties.
  const finalCodeInsightsObjectWithExtras = finalCodeInsightsMap as any;
  finalCodeInsightsObjectWithExtras.projectSummary = summaryToAdd;
  finalCodeInsightsObjectWithExtras.components = componentsToAdd;

  // 4. Construct the final ProjectContext object
  const finalContext: ProjectContext = {
    techStack: mergedBase.techStack as ProjectContext['techStack'],
    codeInsights: finalCodeInsightsObjectWithExtras,
    projectRootPath: '',
    packageJson: {},
  };

  return finalContext;
};

// Example of a default mock instance if needed
export const mockProjectContext = createMockProjectContext();
