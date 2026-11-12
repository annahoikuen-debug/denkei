import { requireEnv } from '@documenso/lib/utils/env';

export const REQUIRED_SERVER_ENV_VARS = [
  'NEXTAUTH_SECRET',
  'NEXT_PRIVATE_ENCRYPTION_KEY',
  'NEXT_PRIVATE_DATABASE_URL',
] as const;

export type ValidateEnvOptions = {
  isTest?: boolean;
  exitOnFailure?: boolean;
};

export const validateRequiredEnv = (options?: ValidateEnvOptions): void => {
  const isTest = options?.isTest ?? (process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true');

  if (isTest) {
    return;
  }

  const missingVars: string[] = [];
  for (const envKey of REQUIRED_SERVER_ENV_VARS) {
    try {
      requireEnv(envKey);
    } catch {
      missingVars.push(envKey);
    }
  }

  if (missingVars.length > 0) {
    const errorMsg = `[FATAL] Missing required environment variable(s) on startup: ${missingVars.join(', ')}`;
    console.error(errorMsg);

    const shouldExit = options?.exitOnFailure ?? process.env.NODE_ENV === 'production';
    if (shouldExit) {
      process.exit(1);
    } else {
      throw new Error(errorMsg);
    }
  }
};
