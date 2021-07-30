module.exports = {
    roots: ['<rootDir>/test', '<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFiles: ['./jest.canvas.ts'],
    testEnvironmentOptions: {
        resources: 'usable'
    },
    testURL: 'http://www.google.es'
}
