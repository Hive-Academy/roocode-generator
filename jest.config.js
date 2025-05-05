/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    // Transform TS files using ts-jest with test-specific config
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    // Explicitly transform problematic ESM JS files from node_modules using ts-jest
    // This regex targets .js files within the specific node_modules directories we need to transform
    '[/\\\\]node_modules[/\\\\](chalk|ora|strip-ansi|log-symbols|cli-cursor|cli-spinners|is-unicode-supported|wcwidth)[/\\\\].+\\.js$':
      ['ts-jest', { tsconfig: 'tsconfig.test.json', allowJs: true }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Ignore compiled output directory
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '^@(core|generators|memory-bank|commands|types)/(.*)$': '<rootDir>/src/$1/$2',
    // Removed tree-sitter mapping, will use jest.mock in the test file
  },
  // Update transformIgnorePatterns: Only ignore node_modules *except* the ones we need to transform
  // This pattern ensures that only the specified modules are *not* ignored.
  transformIgnorePatterns: [
    '/node_modules/(?!chalk|ora|strip-ansi|log-symbols|cli-cursor|cli-spinners|is-unicode-supported|wcwidth).+\\.(js|jsx|mjs|cjs|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss)$', // Ignore CSS modules
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testPathIgnorePatterns: [],
};
