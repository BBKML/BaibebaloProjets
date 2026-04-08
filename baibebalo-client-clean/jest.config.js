/** Jest - tests unitaires (utils, logique métier) - pas de DOM React Native */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: { '^.+\\.js$': 'babel-jest' },
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: ['src/utils/**/*.js', '!src/utils/**/*.test.js'],
  coverageDirectory: 'coverage',
};
