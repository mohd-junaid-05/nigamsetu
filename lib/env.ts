import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  GOOGLE_AI_API_KEY: z.string().min(1, 'GOOGLE_AI_API_KEY is required'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  // Allows skipping in non-boot build steps if explicitly configured
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey || 'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB',
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || 'placeholder-gemini-key',
    };
  }

  const result = envSchema.safeParse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  });

  if (!result.success) {
    const errorList = result.error.issues
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    const msg = `\n[NigamSetu Startup Check] Missing or invalid environment variables:\n${errorList}\n\nPlease check your .env.local file.\n`;
    console.error(msg);
    throw new Error(msg);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
