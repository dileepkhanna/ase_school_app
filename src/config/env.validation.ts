import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().default('ASE School Backend'),
  APP_URL: z.string().default('http://localhost:3000'),

  // Security
  JWT_ACCESS_SECRET: z.string().min(20),
  JWT_REFRESH_SECRET: z.string().min(20),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  // Rate limit
  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),

  // DB
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(7866),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),
  DB_SYNCHRONIZE: booleanString.default('false'),
  DB_LOGGING: booleanString.default('false'),
  
  


  // Redis
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  REDIS_TLS: booleanString.default('false'),

  // Firebase (one of these may be provided)
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional().default(''),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional().default(''),

  // R2
  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET: z.string().optional().default(''),
  R2_PUBLIC_BASE_URL: z.string().optional().default(''),
  R2_ENDPOINT: z.string().optional().default(''),
  R2_REGION: z.string().optional().default('auto'),

  // Mail
  MAIL_FROM_NAME: z.string().default('ASE School'),
  MAIL_FROM_EMAIL: z.string().email(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_SECURE: booleanString.default('false'),

  // OTP
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  OTP_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(60),

  // Logs
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    // Show readable error output
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`❌ Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
