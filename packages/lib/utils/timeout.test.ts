import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout, TimeoutError, withTimeout } from './timeout';

describe('withTimeout', () => {
  it('タイムアウト前に解決された場合は結果を返す', async () => {
    const promise = Promise.resolve('success');
    const result = await withTimeout(promise, 1000);
    expect(result).toBe('success');
  });

  it('タイムアウト後に解決された場合は TimeoutError をスローする', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('delayed'), 200);
    });

    await expect(withTimeout(promise, 50)).rejects.toBeInstanceOf(TimeoutError);
  });

  it('タイムアウトエラーの name プロパティが TimeoutError である', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('delayed'), 200);
    });

    await expect(withTimeout(promise, 50)).rejects.toThrow('timed out');
  });

  it('カスタムエラーメッセージを使用できる', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('delayed'), 200);
    });

    try {
      await withTimeout(promise, 50, { message: 'カスタムタイムアウトメッセージ' });
      expect.fail('TimeoutError がスローされるべき');
    } catch (err) {
      const error = err as Error;
      expect(error.message).toBe('カスタムタイムアウトメッセージ');
    }
  });

  it('エラーがスローされた場合でもタイマーがクリーンアップされる', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('delayed'), 200);
    });

    try {
      await withTimeout(promise, 50);
    } catch {
      // エラーは期待通り
    }

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('同期的に即座に解決される Promise も正常に処理する', async () => {
    const result = await withTimeout(Promise.resolve(42), 1000);
    expect(result).toBe(42);
  });

  it('タイムアウト 0ms でも即座にタイムアウトする', async () => {
    const promise = Promise.resolve('immediate');
    const result = await withTimeout(promise, 0);
    expect(result).toBe('immediate');
  });

  it('タイムアウト直前に解決された場合はタイムアウトにならない', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('just-in-time'), 10);
    });

    const result = await withTimeout(promise, 100);
    expect(result).toBe('just-in-time');
  });
});

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('タイムアウト前にレスポンスを返す', async () => {
    const mockResponse = new Response('body', { status: 200 });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout('https://example.com', { timeoutMs: 5000 });
    expect(result).toBe(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com', {
      signal: expect.any(AbortSignal),
    });
  });

  it('タイムアウト時に TimeoutError をスローする', async () => {
    // AbortController.signal の abort イベントを監視して AbortError で拒絶する fetch モック
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          const abortHandler = () => {
            reject(new DOMException('Aborted', 'AbortError'));
          };
          init?.signal?.addEventListener('abort', abortHandler, { once: true });
          // 決して解決しない（abort されるまで待機）
        });
      },
    );

    await expect(fetchWithTimeout('https://example.com', { timeoutMs: 50 })).rejects.toBeInstanceOf(TimeoutError);
  });

  it('タイムアウト時に AbortController が abort される', async () => {
    let capturedSignal: AbortSignal | undefined;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedSignal = init?.signal;
        return new Promise<Response>((_resolve, reject) => {
          const abortHandler = () => {
            reject(new DOMException('Aborted', 'AbortError'));
          };
          init?.signal?.addEventListener('abort', abortHandler, { once: true });
        });
      },
    );

    try {
      await fetchWithTimeout('https://example.com', { timeoutMs: 50 });
    } catch {
      // 期待通りエラー
    }

    expect(capturedSignal).toBeDefined();
    if (capturedSignal) {
      expect(capturedSignal.aborted).toBe(true);
    }
  });

  it('追加の fetch オプションをマージする', async () => {
    const mockResponse = new Response('body', { status: 200 });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    await fetchWithTimeout('https://example.com', {
      timeoutMs: 5000,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: expect.any(AbortSignal),
    });
  });
});
