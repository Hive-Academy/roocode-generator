// tests/__mocks__/chalk.ts
import { jest } from '@jest/globals';

// Simple mock that returns the input string, allowing chaining
const chalkMock = new Proxy(
  jest.fn((str: string) => str), // Base function just returns the string
  {
    get: (_target, _prop) => {
      // Return the base function for any property access,
      // allowing chaining like chalk.red.bold('text')
      return chalkMock;
    },
  }
);

export default chalkMock;
