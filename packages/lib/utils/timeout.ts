/**
 * 非同期処理のタイムアウト制御ユーティリティ
 *
 * Promise にタイムアウトを設定し、指定時間内に完了しなければ
 * TimeoutError をスローする。Promise.race による競合制御と、
 * setTimeout の適切なクリーンアップ（clearTimeout）により、
 * メモリリークと未処理のタイムアウトハンドルを防止する。
 */

/**
 * タイムアウトエラークラス
 *
 * Promise.race によりタイムアウトが発生した際にスローされる。
 * fetch 系 AbortController との互換性を持たせるため、name プロパティを固定する。
 */
export class TimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super(message ?? `Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    // ES5 互換のため prototype チェーンを修正
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Promise にタイムアウトを設定する。
 *
 * @param promise - タイムアウト対象の Promise
 * @param timeoutMs - タイムアウト時間（ミリ秒）
 * @param options - オプション（message: エラーメッセージの上書き）
 * @returns Promise<T> - タイムアウト前に完了した場合はその結果、それ以外は TimeoutError をスロー
 *
 * @example
 * const result = await withTimeout(fetchApi(), 5000);
 * // 5 秒以内に完了しなければ TimeoutError がスローされる
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  options?: { message?: string },
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(timeoutMs, options?.message));
    }, timeoutMs);
  });

  try {
    return await Promise.race<T>([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
};

/**
 * fetch リクエストにタイムアウトを設定するラッパー。
 *
 * AbortController を使用してリクエストを中断し、
 * タイムアウト時に描写的なエラーメッセージをスローする。
 *
 * @param input - fetch の入力（URL または Request）
 * @param init - fetch 初期化オプション（timeoutMs を含む）
 * @returns Response - fetch の結果
 * @throws TimeoutError - タイムアウト発生時
 *
 * @example
 * const res = await fetchWithTimeout('https://api.example.com', { timeoutMs: 5000 });
 */
export const fetchWithTimeout = async (
  input: string | URL | Request,
  init: RequestInit & { timeoutMs: number },
): Promise<Response> => {
  const { timeoutMs, ...fetchInit } = init;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...fetchInit, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TimeoutError(timeoutMs, `Request timed out after ${timeoutMs}ms`);
    }

    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }
};
