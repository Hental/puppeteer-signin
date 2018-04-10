const config = {
  rootDir: '.',
  setupFiles: ['<rootDir>/test/setup.ts'],
  testRegex: 'test/.*\\.(test|spec)\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
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

module.exports = config;
