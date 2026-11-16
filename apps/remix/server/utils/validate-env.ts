import { requireEnv } from '@documenso/lib/utils/env';

export const REQUIRED_SERVER_ENV_VARS = ['NEXTAUTH_SECRET', 'NEXT_PRIVATE_ENCRYPTION_KEY'] as const;

export type ValidateEnvOptions = {
  isTest?: boolean;
  exitOnFailure?: boolean;
};

export const validateRequiredEnv = (options?: ValidateEnvOptions): void => {
  const isTest = options?.isTest ?? process.env.NODE_ENV === 'test';

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

  // データベース接続 URL の検証:
  // 一般的なホスティング環境 (Vercel, Railway, Supabase 等) から注入される
  // DATABASE_URL / POSTGRES_URL も許容し、NEXT_PRIVATE_DATABASE_URL へフォールバック代入する。
  const dbUrl =
    process.env.NEXT_PRIVATE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!dbUrl) {
    missingVars.push('NEXT_PRIVATE_DATABASE_URL (or DATABASE_URL / POSTGRES_URL)');
  } else if (!process.env.NEXT_PRIVATE_DATABASE_URL) {
    process.env.NEXT_PRIVATE_DATABASE_URL = dbUrl;
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
