const base = require('@stemn/jest-config');

module.exports = {
  ...base,
  watchPathIgnorePatterns: ['src/__tests__/__fixtures__/**']
};
