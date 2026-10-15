/**
 * フェーズ2 ステップ10: firebase-admin 遅延ラッパー
 *
 * firebase-admin はオプション依存のため、未インストール環境では
 * すべての関数が安全に失敗する(OTP へのフォールバックが発火する)。
 *
 * 環境変数:
 * - FIREBASE_SERVICE_ACCOUNT_JSON : サービスアカウント JSON
 * - FIREBASE_API_KEY              : Web API キー
 * - FIREBASE_EMULATOR             : 'true' で Emulator Suite 対応
 */

export type FirebaseEmailLinkResult =
    | { success: true; expiresAt: Date }
    | { success: false; error: string };

export type FirebaseSessionResult = {
    valid: boolean;
    email?: string;
    error?: string;
};

const isFirebaseConfigured = (): boolean => {
    return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_EMULATOR);
};

/**
 * Firebase Authentication のメールリンク(サインインリンク)を発行する。
 */
export const buildEmailLink = async (email: string): Promise<FirebaseEmailLinkResult> => {
    if (!isFirebaseConfigured()) {
        return { success: false, error: 'Firebase is not configured' };
    }

    try {
        // firebase-admin はオプション依存。未インストール環境では失敗扱い(OTPへフォールバック)
        // Rollup の eval 警告を回避するため Function コンストラクタで動的ロード
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin: any = await dynamicImport('firebase-admin').catch(() => null);

        if (!admin || typeof admin.getApps !== 'function') {
            return { success: false, error: 'firebase-admin is not installed' };
        }

        const app = admin.getApps()[0] ?? admin.initializeApp();

        // 有効期限: Firebase メールリンクの既定(1時間)に合わせる
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await app
            .auth()
            .generateSignInWithEmailLink(email, new URL(`https://link.documenso.local?email=${encodeURIComponent(email)}`).toString());

        return { success: true, expiresAt };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

/**
 * Firebase メールリンク検証済みセッション識別子(IDトークン)を検証する。
 * 1回限り使用を確認するため、検証済みトークンはキャッシュしない(都度 verifyIdToken)。
 */
export const verifyFirebaseSession = async (
    sessionIdentifier: string,
): Promise<FirebaseSessionResult> => {
    if (!isFirebaseConfigured()) {
        return { valid: false, error: 'Firebase is not configured' };
    }

    try {
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin: any = await dynamicImport('firebase-admin').catch(() => null);

        if (!admin || typeof admin.getApps !== 'function') {
            return { valid: false, error: 'firebase-admin is not installed' };
        }

        const app = admin.getApps()[0] ?? admin.initializeApp();

        const decodedToken = await app.auth().verifyIdToken(sessionIdentifier, true);

        const email = typeof decodedToken.email === 'string' ? decodedToken.email : undefined;
        const isEmailVerified = decodedToken.email_verified === true;

        // メール認証済みであることを必須とする(転送悪用対策)
        if (!email || !isEmailVerified) {
            return { valid: false, error: 'Email not verified' };
        }

        return { valid: true, email };
    } catch (error) {
        return { valid: false, error: error instanceof Error ? error.message : String(error) };
    }
};
