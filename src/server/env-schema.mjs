import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXTAUTH_SECRET: z.string(),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_SECRET: z.string(),
  ALLOWED_EMAILS: z.string(),
  ADMIN_EMAILS: z.string(),
});
