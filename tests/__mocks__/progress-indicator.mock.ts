// tests/__mocks__/progress-indicator.mock.ts
// Manual mock for the ProgressIndicator class

export class ProgressIndicator {
  start = jest.fn();
  update = jest.fn();
  succeed = jest.fn();
  fail = jest.fn();
  // Add any other methods or properties used by the class under test
}

// You might need to export it as default if that's how it's imported elsewhere,
// but based on the import `import { ProgressIndicator } ...`, a named export is correct.
