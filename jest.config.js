const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/tests/"
  ],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    '^ioredis$': '<rootDir>/__mocks__/ioredis.js',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/generated/**",
    "!src/index.ts",
    "!src/utils/config.ts",
  ],
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      lines: 95,
      functions: 95,
      branches: 95,
      statements: 95,
    },
  },
};