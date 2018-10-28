const base = require('@stemn/jest-config');

module.exports = {
  ...base,
  testPathIgnorePatterns: [
    ...base.testPathIgnorePatterns,
    'src/__tests__/__fixtures__/**',
  ],
  watchPathIgnorePatterns: ['src/__tests__/__fixtures__/**']
};

