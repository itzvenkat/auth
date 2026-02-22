import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  APP_URL: Joi.string().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().default('http://localhost:4200'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('', null).optional(),

  // Email
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().default(1025),
  SMTP_USER: Joi.string().allow('', null).optional(),
  SMTP_PASS: Joi.string().allow('', null).optional(),
  SMTP_FROM: Joi.string().default('"Auth Service" <noreply@auth.local>'),
  SMTP_SECURE: Joi.boolean().default(false),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().allow('', null).optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('', null).optional(),
  GOOGLE_CALLBACK_URL: Joi.string().default('http://localhost:3000/auth/google/callback'),

  // Security
  BCRYPT_SALT_ROUNDS: Joi.number().default(12),
  MAX_LOGIN_ATTEMPTS: Joi.number().default(5),
  LOCK_TIME_MINUTES: Joi.number().default(15),
  TOTP_APP_NAME: Joi.string().default('AuthService'),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
});
