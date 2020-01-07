'use strict';

module.exports = (config) => {
    config.set({
        mutator: 'javascript',
        packageManager: 'npm',
        reporters: ['html', 'clear-text', 'progress'],
        testRunner: 'mocha',
        transpilers: [],
        testFramework: 'mocha',
        coverageAnalysis: 'perTest',
        mochaOptions: {
            spec: ['test/unit/**/*.js']
        }
    });
};
