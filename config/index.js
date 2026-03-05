/**
 * Central config from environment. Use this instead of process.env directly.
 */
require('dotenv').config();

const env = (key, defaultValue) => {
  const v = process.env[key];
  return v !== undefined && v !== '' ? v : defaultValue;
};

const config = {
  port: parseInt(env('PORT', '3000'), 10) || 3000,
  nodeEnv: env('NODE_ENV', 'development'),

  database: {
    url: env('DATABASE_URL') || env('DATABASE_PUBLIC_URL'),
    ssl: (() => {
      const s = (env('DATABASE_SSL') || 'true').toLowerCase();
      return s !== 'false';
    })(),
  },

  session: {
    secret: env('SESSION_SECRET') || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-change-in-production'),
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  cors: {
    frontendOrigin: env('FRONTEND_ORIGIN') || null,
    isCrossOrigin: Boolean(env('FRONTEND_ORIGIN')),
  },

  auth: {
    registrationPassword: env('REGISTRATION_PASSWORD') || (process.env.NODE_ENV === 'production' ? null : 'RE@CT2026'),
  },

  demo: {
    enabled: env('DEMO_USERS_ENABLED') !== 'false' && process.env.NODE_ENV !== 'production',
    directorEmail: env('DIRECTOR_EMAIL', 'jatlee@stpeters.co.za'),
    directorPassword: env('DEMO_DIRECTOR_PASSWORD', 'director123!'),
    teacherEmail: 'teacher@stpeters.co.za',
    teacherPassword: env('DEMO_TEACHER_PASSWORD', 'teacher123!'),
  },
};

module.exports = config;
