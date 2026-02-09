module.exports = {
  testEnvironment: '<rootDir>/tests/jest-environment-node-localstorage.js',
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/outputs'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/outputs', '<rootDir>/tests/performance/load.test.js'],
  modulePathIgnorePatterns: ['<rootDir>/outputs'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  verbose: true,
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/database/migrate.js',
    '!src/database/seed*.js',
    '!src/jobs/**',
  ],
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'BAIBEBALO Test Report',
        outputPath: 'tests/reports/test-report.html',
      },
    ],
  ],
};
