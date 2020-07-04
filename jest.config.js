module.exports = {
	testEnvironment: "node",
  coveragePathIgnorePatterns: ["coverage", "datasources"],
  coverageReporters: [
    "json-summary",
    "text",
    "lcov"
  ]
}
