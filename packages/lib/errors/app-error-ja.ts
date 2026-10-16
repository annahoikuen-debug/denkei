import { AppErrorCode } from './app-error';

/**
 * フェーズ1 ステップ10: AppError のエラーコードに対する日本語表示マップ。
 * フロント側は AppError.parse(error) の結果と合わせてこのマップの文言を表示する。
 */
type KnownAppErrorCode = AppErrorCode | 'RECIPIENT_LIMIT_EXCEEDED' | 'PLAN_MONTHLY_LIMIT_EXCEEDED';

export const APP_ERROR_JA_MESSAGES: Partial<Record<AppErrorCode, string>> & Record<KnownAppErrorCode | string, string> =
  {
    [AppErrorCode.ALREADY_EXISTS]: '既に存在します。',
    [AppErrorCode.EXPIRED_CODE]: '有効期限が切れています。もう一度お試しください。',
    [AppErrorCode.INVALID_BODY]: 'リクエストの内容が正しくありません。',
    [AppErrorCode.INVALID_REQUEST]: 'リクエストが不正です。',
    [AppErrorCode.RECIPIENT_EXPIRED]: 'この署名リンクの有効期限が切れています。',
    [AppErrorCode.LIMIT_EXCEEDED]: '今月の送信上限数に達しました。プランをアップグレードしてください。',
    RECIPIENT_LIMIT_EXCEEDED: '受信者数の上限を超えています。プランをアップグレードしてください。',
    PLAN_MONTHLY_LIMIT_EXCEEDED: '当月の送信可能件数に達しました。プラン変更で上限を引き上げることができます。',
    [AppErrorCode.NOT_FOUND]: '対象が見つかりません。',
    [AppErrorCode.NOT_IMPLEMENTED]: 'この機能はまだ利用できません。',
    [AppErrorCode.NOT_SETUP]: '設定が完了していません。',
    [AppErrorCode.MISSING_ENV_VAR]: 'サーバー設定に問題があります。管理者にお問い合わせください。',
    [AppErrorCode.INVALID_CAPTCHA]: 'CAPTCHA の検証に失敗しました。',
    [AppErrorCode.UNAUTHORIZED]: '認証が必要です。サインインしてください。',
    [AppErrorCode.FORBIDDEN]: 'この操作を行う権限がありません。',
    [AppErrorCode.UNKNOWN_ERROR]: '不明なエラーが発生しました。',
    [AppErrorCode.RETRY_EXCEPTION]: '一時的なエラーです。もう一度お試しください。',
    [AppErrorCode.SCHEMA_FAILED]: 'データの検証に失敗しました。',
    [AppErrorCode.TOO_MANY_REQUESTS]: 'リクエストが多すぎます。しばらくしてから再試行してください。',
    [AppErrorCode.TWO_FACTOR_AUTH_FAILED]: '2段階認証に失敗しました。',
    [AppErrorCode.TWO_FACTOR_SETUP_REQUIRED]: '2段階認証の設定が必要です。',
    [AppErrorCode.TWO_FACTOR_MISSING_SECRET]: '2段階認証の設定が見つかりません。',
    [AppErrorCode.TWO_FACTOR_MISSING_CREDENTIALS]: '2段階認証の情報が不足しています。',
    [AppErrorCode.INCORRECT_TWO_FACTOR_CODE]: '2段階認証コードが正しくありません。',
    [AppErrorCode.NO_PASSWORD]: 'パスワードが設定されていません。',
    [AppErrorCode.INCORRECT_PASSWORD]: 'パスワードが正しくありません。',
    [AppErrorCode.SAME_PASSWORD]: '現在のパスワードと同じです。別のパスワードを設定してください。',
    [AppErrorCode.WEBHOOK_INVALID_REQUEST]: 'Webhook リクエストが不正です。',
    [AppErrorCode.ENVELOPE_DRAFT]: 'このドキュメントはまだ送信されていません。',
    [AppErrorCode.ENVELOPE_COMPLETED]: 'このドキュメントはすでに完了しています。',
    [AppErrorCode.ENVELOPE_REJECTED]: 'このドキュメントは拒否されました。',
    [AppErrorCode.ENVELOPE_CANCELLED]: 'このドキュメントはキャンセルされました。',
    [AppErrorCode.ENVELOPE_LEGACY]: 'このドキュメントは旧エディタで管理されています。',
    [AppErrorCode.ENVELOPE_TSP_LOCKED]: 'このドキュメントは確定済みのため編集できません。',
    [AppErrorCode.SENDER_DISABLED]: '差出人のアカウントが無効になっています。',
    [AppErrorCode.RECIPIENT_ALREADY_SIGNED]: 'すでに署名済みのため、追加の操作は不要です。',
    [AppErrorCode.RECIPIENT_HAS_UNSIGNED_FIELDS]:
      '未記入の必須フィールドがあります。すべて入力してから再試行してください。',
    [AppErrorCode.RECIPIENT_OUT_OF_TURN]: 'まだ署名の順番ではありません。',
    [AppErrorCode.MISSING_SIGNATURE_FIELD]: '署名フィールドが割り当てられていません。',
  };

/**
 * エラーコードに対応する日本語メッセージを取得する。
 * 未定義のコードは汎用メッセージを返す。
 */
export const getAppErrorMessageJa = (code: string | undefined | null): string => {
  if (code && code in APP_ERROR_JA_MESSAGES) {
    return APP_ERROR_JA_MESSAGES[code];
  }

  return APP_ERROR_JA_MESSAGES[AppErrorCode.UNKNOWN_ERROR];
};
