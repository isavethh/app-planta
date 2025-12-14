// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimizaciones para iniciar más rápido
// Limitar watchFolders para que Metro no escanee directorios innecesarios
config.watchFolders = [__dirname];

// Optimizar resolver para que sea más rápido
config.resolver = {
  ...config.resolver,
  // Limitar extensiones a las necesarias (más rápido)
  sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'mjs'],
};

module.exports = config;
