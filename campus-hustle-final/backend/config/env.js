// backend/config/env.js
'use strict';

require('dotenv').config();

const cleanEnv = (key) => {
  const value = process.env[key];
  if (!value) return undefined;
  return value.trim().replace(/^['"]|['"]$/g, '');
};

const isPlaceholder = (value) => {
  if (!value) return false;
  return /^(your_|replace_|changeme|passkey|mpesa_passkey|your-daraja-passkey)/i.test(value);
};

const getMpesaEnvironment = () => (cleanEnv('MPESA_ENVIRONMENT') || 'sandbox').toLowerCase();
const getMpesaShortcode = () => cleanEnv('MPESA_SHORTCODE') || '174379';
const shouldUseDefaultSandboxPasskey = () => {
  return (
    getMpesaEnvironment() === 'sandbox' &&
    getMpesaShortcode() === '174379' &&
    cleanEnv('MPESA_USE_CUSTOM_PASSKEY') !== 'true'
  );
};
const getMpesaPasskey = () => {
  const configuredPasskey = cleanEnv('MPESA_PASSKEY');

  if (shouldUseDefaultSandboxPasskey()) {
    return 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
  }
  if (configuredPasskey && !isPlaceholder(configuredPasskey)) return configuredPasskey;

  return undefined;
};

const required = ['DATABASE_URL', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[CONFIG] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  db: {
    connectionString: process.env.DATABASE_URL,
    maxConnections: 20,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 2000,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  storage: {
    publicBaseUrl: cleanEnv('PUBLIC_BASE_URL') || `http://localhost:${parseInt(process.env.PORT, 10) || 5000}`,
    uploadDir: cleanEnv('UPLOAD_DIR') || 'public/uploads',
    profileBucket: cleanEnv('PROFILE_PICTURE_BUCKET') || 'profile-pictures',
  },

  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    fromName: 'HustleGrad',
  },

  mpesa: {
    consumerKey: cleanEnv('MPESA_CONSUMER_KEY'),
    consumerSecret: cleanEnv('MPESA_CONSUMER_SECRET'),
    shortcode: getMpesaShortcode(),
    passkey: getMpesaPasskey(),
    usingDefaultSandboxPasskey: shouldUseDefaultSandboxPasskey(),
    callbackUrl: cleanEnv('MPESA_CALLBACK_URL'),
    environment: getMpesaEnvironment(),
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
        ],
  },
};
