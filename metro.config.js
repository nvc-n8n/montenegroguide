const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure web platform is included in resolver
if (!config.resolver.platforms) {
  config.resolver.platforms = [];
}
if (!config.resolver.platforms.includes("web")) {
  config.resolver.platforms.push("web");
}

module.exports = config;
