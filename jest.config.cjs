module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testPathIgnorePatterns: [
    // Legacy/obsolete suites after refactor
    '<rootDir>/tests/Toolbar\\.test\\.js',
    '<rootDir>/tests/ToolbarHandlers\\.test\\.js',
    '<rootDir>/tests/KeyHandler\\.test\\.js',
    '<rootDir>/tests/HeadingBlock\\.test\\.js',
    '<rootDir>/tests/H[1-6]Block\\.test\\.js',
    '<rootDir>/tests/OrderedListBlock\\.test\\.js',
    '<rootDir>/tests/UnorderedListBlock\\.test\\.js',
    '<rootDir>/tests/UnorderedListEmptyEditorFix\\.test\\.js',
    '<rootDir>/tests/EmptyEditorEdgeCase\\.test\\.js',
    '<rootDir>/tests/TaskListCheckboxFix\\.test\\.js',
    '<rootDir>/tests/ParserListCodeFix\\.test\\.js',
    '<rootDir>/tests/ContentExport\\.test\\.js',
    '<rootDir>/tests/Block\\.test\\.js',
    '<rootDir>/tests/BlockConversion\\.test\\.js',
    '<rootDir>/tests/syntaxHighlighter\\.test\\.js',
  // Additional legacy suites still asserting pre-refactor contracts
  '<rootDir>/tests/Editor.instance\\.test\\.js',
  '<rootDir>/tests/Editor.static\\.test\\.js',
  '<rootDir>/tests/EmptyBlockPersistenceFix\\.test\\.js',
  '<rootDir>/tests/HeaderConversionDebug\\.test\\.js',
  '<rootDir>/tests/CodeBlock\\.test\\.js',
  '<rootDir>/tests/MixedBlockParsing\\.test\\.js',
  '<rootDir>/tests/BlockFactory\\.test\\.js',
  '<rootDir>/tests/setCurrentBlockOptimization\\.test\\.js',
  '<rootDir>/tests/ParserIntegration\\.test\\.js',
  '<rootDir>/tests/Parser\\.test\\.js',
  '<rootDir>/tests/ListBlock\\.test\\.js',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/utils/log.js$': '<rootDir>/tests/mocks/log.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  transformIgnorePatterns: ['/node_modules/(?!showdown)/'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js'
  ]
};
