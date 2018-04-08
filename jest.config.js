module.exports = {
  rootDir: '.',
  testRegex: 'test/.*\\.(test|spec)\\.ts$',
  transform: {
    '^.+\\.ts$': '<rootDir>/node_modules/ts-jest/preprocessor.js',
  },
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
  ],
  transformIgnorePatterns: [
    '/dist/',
    '/lib/',
    'node_modules/[^/]+?/(?!(es|node_modules)/)', // Ignore modules without es dir
  ],
  collectCoverageFrom: [
    'src/*.ts',
    'src/*/*.ts',
  ],
  coverageDirectory: 'test/coverage',
};
