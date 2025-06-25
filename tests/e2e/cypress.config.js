const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'tests/e2e/cypress/support/e2e.js',
    specPattern: 'tests/e2e/cypress/integration/**/*.spec.js',
    fixturesFolder: 'tests/e2e/cypress/fixtures',
    screenshotsFolder: 'tests/e2e/cypress/screenshots',
    videosFolder: 'tests/e2e/cypress/videos',
    downloadsFolder: 'tests/e2e/cypress/downloads',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshot: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,
    experimentalStudio: true,
    experimentalWebKitSupport: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      apiUrl: 'http://localhost:8080/api',
      coverage: true,
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        clearDatabase() {
          // Add database cleanup logic here
          return null;
        },
        seedDatabase() {
          // Add database seeding logic here
          return null;
        },
      });

      // Code coverage configuration
      require('@cypress/code-coverage/task')(on, config);

      return config;
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
    specPattern: 'frontend/react-store-ui/src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/cypress/support/component.js',
  },
});