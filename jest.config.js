module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    "<rootDir>/test"
  ],
  moduleNameMapper: {
    '^ts-proto-twirp$': '<rootDir>/src',
    '^ts-proto-twirp\/(.*)$': '<rootDir>/src/$1',
  },
  "collectCoverageFrom": [
    "src/**/*.ts"
  ],
};
