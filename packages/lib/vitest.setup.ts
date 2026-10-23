// vitest v4 で vi.stubEnv / vi.unstubAllEnvs がネイティブでサポートされている環境では
// ポリフィルは不要だが、一部環境で未定義となる場合があるため安全側に倒して実装する。

const originalEnv = { ...process.env };

const stubEnv = (variable: string, value: string | undefined, options?: { override?: boolean }) => {
  if (options?.override || process.env[variable] === undefined) {
    if (value === undefined) {
      delete process.env[variable];
    } else {
      process.env[variable] = value;
    }
  }
};

const unstubAllEnvs = () => {
  process.env = { ...originalEnv };
};

export { stubEnv, unstubAllEnvs };

// vi グローバルに追加（型チェック回避のため any として代入）
declare global {
  const vi: any;
}
if (typeof globalThis.vi !== 'undefined' && globalThis.vi) {
  if (!globalThis.vi.stubEnv) {
    globalThis.vi.stubEnv = stubEnv;
  }
  if (!globalThis.vi.unstubAllEnvs) {
    globalThis.vi.unstubAllEnvs = unstubAllEnvs;
  }
}
