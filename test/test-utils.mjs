/**
 * Test utilities for ebt-vue3
 * Provides common mocking functions and setup helpers
 */

/**
 * Mock the navigator object for Node.js environment
 * @param {string[]} languages - Array of language codes
 */
export const mockNavigator = (languages) => {
  // Remove existing navigator if it exists
  if (global.navigator) {
    delete global.navigator;
  }
  
  // Create a new navigator object
  Object.defineProperty(global, 'navigator', {
    value: { languages },
    writable: true,
    configurable: true
  });
};

/**
 * Mock localStorage for Node.js environment
 */
export const mockLocalStorage = () => {
  if (global.localStorage) {
    return;
  }
  
  // Simple localStorage mock
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(key => delete store[key]); },
    length: 0,
    key: (index) => Object.keys(store)[index] || null
  };
};

/**
 * Mock window object for Node.js environment
 */
export const mockWindow = () => {
  if (!global.window) {
    global.window = {};
  }
  
  // Add localStorage to window if not present
  if (!global.window.localStorage && global.localStorage) {
    global.window.localStorage = global.localStorage;
  }
};

/**
 * Setup common test environment
 * @param {object} options - Configuration options
 * @param {string[]} options.navigatorLanguages - Languages for navigator mock
 */
export const setupTestEnvironment = (options = {}) => {
  const { navigatorLanguages = ['en-US'] } = options;
  
  mockNavigator(navigatorLanguages);
  mockLocalStorage();
  mockWindow();
};
