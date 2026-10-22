const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Keep this application independent from the legacy SDK in the repository root.
config.resolver.nodeModulesPaths = [require('path').resolve(__dirname, 'node_modules')];
// Nested React Native dependencies must remain resolvable as well.
config.resolver.disableHierarchicalLookup = false;
module.exports = config;
