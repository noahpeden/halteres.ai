module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    // Reanimated must be the LAST plugin per its docs.
    plugins: ['react-native-reanimated/plugin'],
  };
};
