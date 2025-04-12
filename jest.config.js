module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/app.ts',
        '!src/config/*.ts',
        '!**/node_modules/**',
        '!**/dist/**',
    ],
    coverageReporters: ['text', 'lcov'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    verbose: true,
};