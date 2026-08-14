module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // El plugin de Reanimated/Worklets debe ir último en la lista.
    plugins: ['react-native-worklets/plugin'],
  };
};
