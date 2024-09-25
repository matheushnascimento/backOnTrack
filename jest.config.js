const nextJest = require("next/jest");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.development" });

const createJestConfig = nextJest();
const jestConfig = createJestConfig({
  moduleDirectories: ["node_modules", "<rootDir>"],
  setupFiles: ["dotenv/config"],
  testTimeout: 7000,
});

module.exports = jestConfig;
