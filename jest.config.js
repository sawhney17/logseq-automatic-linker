// This file was created with:
// yarn ts-jest config:init

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  // https://stackoverflow.com/questions/44467657/jest-better-way-to-disable-console-inside-unit-tests
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
