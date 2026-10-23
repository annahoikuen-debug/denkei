/**
 * フェーズ3 ステップ21: API v1 廃止手順(第1段階: 通知+flag)
 *
 * 3段階手順:
 *   1. deprecated 通知 + flag(本ステップ)
 *   2. flag で無効化(既定 false)
 *   3. 物理削除(観察期間後に別 PR で実施)
 */

/**
 * API v1 の有効フラグ。既定は false(SaaS では無効)。
 * セルフホスト移行ユーザーは環境変数で有効化可能。
 */
export const isApiV1Enabled = (): boolean => {
  return process.env.NEXT_PRIVATE_ENABLE_API_V1 === 'true';
};

/**
 * API v1 deprecated 通知レスポンスヘッダ。
 * flag 有効時(移行期間中)に付与する。
 */
export const API_V1_DEPRECATION_HEADERS = {
  'X-Api-Deprecated': 'true',
  'X-Api-Sunset': 'Documenso API v1 is deprecated. Please migrate to /api/v2. Sunset date will be announced.',
} as const;

/**
 * Embedding / EE のビルド除外 flag(ステップ20)。
 * SaaS 版では既定無効。セルフホストでは有効化可能。
 */
export const isEmbeddingEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_EMBEDDING === 'true';
};

export const isEnterpriseEditionEnabled = (): boolean => {
  return process.env.NEXT_PRIVATE_ENABLE_EE === 'true';
};

/**
 * ジョブプロバイダ(ステップ22)。SaaS では local(DBキュー)固定。
 */
export const getJobsProvider = (): 'local' | 'inngest' | 'bullmq' => {
  const provider = process.env.NEXT_PRIVATE_JOBS_PROVIDER;

  if (provider === 'inngest' || provider === 'bullmq') {
    // オプトイン: 明示的に指定された場合のみ local 以外を許可
    return provider;
  }

  return 'local';
};

/**
 * ストレージトランスポート(ステップ23)。SaaS では s3 標準。
 * database は開発/テスト限定。
 */
export const getUploadTransport = (): 's3' | 'database' => {
  const transport = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (transport === 'database') {
    const isDevOrTest = ['development', 'test'].includes(process.env.NODE_ENV ?? '');

    if (!isDevOrTest && process.env.NEXT_PRIVATE_ALLOW_DATABASE_UPLOAD_IN_PRODUCTION !== 'true') {
      console.warn(
        '[upload] The "database" storage transport is only intended for development/test. ' +
          'Set NEXT_PRIVATE_ALLOW_DATABASE_UPLOAD_IN_PRODUCTION=true to override.',
      );
    }

    return 'database';
  }

  return 's3';
};

/**
 * 既存: PostHog 設定(上書きにより欠落したため復元)
 * 引数なしで呼ばれ、未設定時は null を返す。
 */
export const extractPostHogConfig = (): { key: string; host: string } | null => {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!key) {
    return null;
  }

  return {
    key,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  };
};
