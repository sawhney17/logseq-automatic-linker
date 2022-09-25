// https://stackoverflow.com/questions/44467657/jest-better-way-to-disable-console-inside-unit-tests
global.console = {
  ...console,
  // uncomment to ignore a specific log level
  // log: jest.fn(),
  debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
