const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// SDK source lives in the parent directory
const sdkRoot = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Watch the SDK source for hot reload during development
  watchFolders: [sdkRoot],
  resolver: {
    // All dependencies resolve from example's node_modules only.
    // The root has no native packages — only typescript/eslint dev tools.
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
