/* jshint node: true */

module.exports = function(environment) {
  var ENV = {
    modulePrefix: 'ldap-auth',
    environment: environment,
    rootURL: '/',
    locationType: 'auto',
    contentSecurityPolicy: {
      'connect-src': "https://404notfound.tech:8080"
    },

    linkBaseURL: 'https://404notfound.tech:8080/openfile/',
    rootAPI: 'https://404notfound.tech:8080/',
    mimes: {
      directory: {
        name: 'directory',
        kind: 'Folder',
        icon: 'folder',
      },
      png: {
        name: 'image/png',
        kind: 'PNG Image',
        icon: 'photo',
      },
      jpeg: {
        name: 'image/jpeg',
        kind: 'JPEG Image',
        icon: 'photo',
      },
    },

    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false
      }
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    }
  };

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
  }

  if (environment === 'production') {

  }

  return ENV;
};
