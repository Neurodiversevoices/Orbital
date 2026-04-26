const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Disable Watchman — hangs on this machine (iCloud symlink issue)
config.watcher = {
  watchman: false,
};

module.exports = config;
