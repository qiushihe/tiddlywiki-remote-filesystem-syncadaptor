module.exports = {
  testEnvironment: "jsdom",
  rootDir: "..",
  moduleNameMapper: {
    "^\\$:/plugins/qiushihe/remote-filesystem/([^.]+).(.+)$": [
      "<rootDir>/src/$1.ts"
    ]
  },
  setupFilesAfterEnv: ["<rootDir>/jest/setup.ts"]
};
