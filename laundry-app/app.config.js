const appJson = require('./app.json');

// Load .env into process.env (used when running expo start / build)
require('dotenv').config();

module.exports = {
  ...appJson,
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
};
