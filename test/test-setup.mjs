/**
 * Global test setup for ebt-vue3
 * This file is automatically loaded before running tests
 */

import 'fake-indexeddb/auto';
import { setupTestEnvironment } from './test-utils.mjs';
import { afterEach } from 'vitest';

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

// Track unhandled errors during tests
let unhandledErrors = [];

const originalOnError = process.listeners('uncaughtException');
const originalOnRejection = process.listeners('unhandledRejection');

process.on('uncaughtException', (err) => {
  unhandledErrors.push(err);
});

process.on('unhandledRejection', (reason) => {
  unhandledErrors.push(new Error(`Unhandled Rejection: ${reason}`));
});

// Fail test if unhandled errors occurred
afterEach(() => {
  if (unhandledErrors.length > 0) {
    const err = unhandledErrors[0];
    unhandledErrors = [];
    throw err;
  }
});

console.log('Test environment setup complete');
