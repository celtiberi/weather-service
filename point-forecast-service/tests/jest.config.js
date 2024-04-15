console.log('jest.config.js is being loaded');
module.exports =  {
    setupFiles: ['<rootDir>/../../jest.setup.js'], // Adjusted path with <rootDir>
    testMatch: ['**/tests/**/*test*.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
};