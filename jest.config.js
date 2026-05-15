const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**/page.tsx",
    "!src/app/**/layout.tsx",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  roots: ["<rootDir>/tests"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
  testEnvironment: "jest-environment-node",
  testMatch: ["**/tests/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.next", "<rootDir>/coverage"],
  testPathIgnorePatterns: ["<rootDir>/.next", "<rootDir>/coverage", "<rootDir>/node_modules"],
  watchPathIgnorePatterns: ["<rootDir>/.next", "<rootDir>/coverage"],
};

module.exports = createJestConfig(customJestConfig);
