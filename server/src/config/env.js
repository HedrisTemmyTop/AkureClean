require('dotenv').config();

const requiredEnvs = [
  'PORT',
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'PAYSTACK_SECRET_KEY'
];

requiredEnvs.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`Warning: Environment variable ${envVar} is missing.`);
  }
});

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/akure_clean',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development'
};
