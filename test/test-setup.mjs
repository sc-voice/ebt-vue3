/**
 * Global test setup for ebt-vue3
 * This file is automatically loaded by mocha before running tests
 */

import { setupTestEnvironment } from './test-utils.mjs';

// Setup global test environment
setupTestEnvironment();

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

// Set default log level to reduce noise during tests
if (typeof process !== 'undefined' && process.env.LOG_LEVEL) {
  // Log level can be overridden via environment variable
} else {
  // Default to warn level to reduce test noise
  process.env.LOG_LEVEL = 'warn';
}

console.log('Test environment setup complete');
