// import { Env } from './env.validation';

// export type AppConfig = ReturnType<typeof configuration>;

// /**
//  * Normalized configuration object used by ConfigService.
//  * Keep this as the single source of truth for env mapping.
//  */
// export function configuration(env: Env) {
//   return {
//     nodeEnv: env.NODE_ENV,
//     port: env.PORT,
//     app: {
//       name: env.APP_NAME,
//       url: env.APP_URL,
//     },

//     security: {
//       jwtAccessSecret: env.JWT_ACCESS_SECRET,
//       jwtRefreshSecret: env.JWT_REFRESH_SECRET,
//       jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
//       jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
//       bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
//       throttle: {
//         ttlSeconds: env.THROTTLE_TTL_SECONDS,
//         limit: env.THROTTLE_LIMIT,
//       },
//     },

//     database: {
//       host: env.DB_HOST,
//       port: env.DB_PORT,
//       username: env.DB_USERNAME,
//       password: env.DB_PASSWORD,
//       name: env.DB_NAME,
//       synchronize: env.DB_SYNCHRONIZE,
//       logging: env.DB_LOGGING,
//     },

//     redis: {
//       host: env.REDIS_HOST,
//       port: env.REDIS_PORT,
//       password: env.REDIS_PASSWORD || undefined,
//       db: env.REDIS_DB,
//       tls: env.REDIS_TLS,
//     },

//     firebase: {
//       serviceAccountPath: env.FIREBASE_SERVICE_ACCOUNT_PATH || undefined,
//       serviceAccountJson: env.FIREBASE_SERVICE_ACCOUNT_JSON || undefined,
//     },

//     r2: {
//       accountId: env.R2_ACCOUNT_ID || undefined,
//       accessKeyId: env.R2_ACCESS_KEY_ID || undefined,
//       secretAccessKey: env.R2_SECRET_ACCESS_KEY || undefined,
//       bucket: env.R2_BUCKET || undefined,
//       publicBaseUrl: env.R2_PUBLIC_BASE_URL || undefined,
//       endpoint: env.R2_ENDPOINT || undefined,
//       region: env.R2_REGION || 'auto',
//     },

//     mail: {
//       fromName: env.MAIL_FROM_NAME,
//       fromEmail: env.MAIL_FROM_EMAIL,
//       smtp: {
//         host: env.SMTP_HOST,
//         port: env.SMTP_PORT,
//         user: env.SMTP_USER,
//         pass: env.SMTP_PASS,
//         secure: env.SMTP_SECURE,
//       },
//     },

//     otp: {
//       length: env.OTP_LENGTH,
//       ttlSeconds: env.OTP_TTL_SECONDS,
//       maxAttempts: env.OTP_MAX_ATTEMPTS,
//       cooldownSeconds: env.OTP_COOLDOWN_SECONDS,
//     },

//     logLevel: env.LOG_LEVEL,
//   };
// }







import { Env, validateEnv } from './env.validation';

export type AppConfig = ReturnType<typeof configuration>;

/**
 * Normalized configuration object used by ConfigService.
 * Keep this as the single source of truth for env mapping.
 */
export function configuration() {
  const env: Env = validateEnv(process.env);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    app: {
      name: env.APP_NAME,
      url: env.APP_URL,
    },

    security: {
      jwtAccessSecret: env.JWT_ACCESS_SECRET,
      jwtRefreshSecret: env.JWT_REFRESH_SECRET,
      jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
      throttle: {
        ttlSeconds: env.THROTTLE_TTL_SECONDS,
        limit: env.THROTTLE_LIMIT,
      },
    },

    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      name: env.DB_NAME,
      synchronize: env.DB_SYNCHRONIZE,
      logging: env.DB_LOGGING,
    },

    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB,
      tls: env.REDIS_TLS,
    },

    firebase: {
      serviceAccountPath: env.FIREBASE_SERVICE_ACCOUNT_PATH || undefined,
      serviceAccountJson: env.FIREBASE_SERVICE_ACCOUNT_JSON || undefined,
    },

    r2: {
      accountId: env.R2_ACCOUNT_ID || undefined,
      accessKeyId: env.R2_ACCESS_KEY_ID || undefined,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY || undefined,
      bucket: env.R2_BUCKET || undefined,
      publicBaseUrl: env.R2_PUBLIC_BASE_URL || undefined,
      endpoint: env.R2_ENDPOINT || undefined,
      region: env.R2_REGION || 'auto',
    },

    mail: {
      fromName: env.MAIL_FROM_NAME,
      fromEmail: env.MAIL_FROM_EMAIL,
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        secure: env.SMTP_SECURE,
      },
    },

    otp: {
      length: env.OTP_LENGTH,
      ttlSeconds: env.OTP_TTL_SECONDS,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      cooldownSeconds: env.OTP_COOLDOWN_SECONDS,
    },

    logLevel: env.LOG_LEVEL,
  };
}
