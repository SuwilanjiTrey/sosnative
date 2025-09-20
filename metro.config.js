// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add CORS headers for cloud workstation
config.server = {
  ...config.server,
  cors: {
    origin: true, // Allow all origins in dev
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  },
};

module.exports = config;