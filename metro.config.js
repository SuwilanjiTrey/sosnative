const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

config.resolver.alias = {
  'react-native-maps': Platform.select({
    web: path.resolve(__dirname, 'path/to/web-fallback'),
    default: 'react-native-maps',
  }),
};

module.exports = config;