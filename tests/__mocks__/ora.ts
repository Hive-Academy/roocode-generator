// tests/__mocks__/ora.ts
import { jest } from '@jest/globals';

// Mock the ora instance methods
const mockOraInstance = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  stopAndPersist: jest.fn().mockReturnThis(),
  clear: jest.fn().mockReturnThis(),
  render: jest.fn().mockReturnThis(),
  frame: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(), // Allow setting text
  prefixText: jest.fn().mockReturnThis(), // Allow setting prefixText
  get isSpinning() {
    // Simulate spinning state if needed, default to false
    return false;
  },
  set isSpinning(value: boolean) {
    // Allow setting isSpinning if a test needs it
  },
  color: 'gray', // Default color
  spinner: 'dots', // Default spinner
};

// Mock the default export (the factory function)
const ora = jest.fn((options?: string | { text?: string }) => {
  // If options are provided, update the mock instance's text
  if (typeof options === 'string') {
    mockOraInstance.text = jest.fn().mockReturnValue(options);
  } else if (options?.text) {
    mockOraInstance.text = jest.fn().mockReturnValue(options.text);
  }
  // Return the mock instance
  return mockOraInstance;
});

// Assign the mock instance properties to the factory mock if needed for static access
Object.assign(ora, mockOraInstance);

export default ora;
