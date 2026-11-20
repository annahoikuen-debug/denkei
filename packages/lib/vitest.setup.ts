// vitest v4 で vi.stubEnv / vi.unstubAllEnvs がネイティブでサポートされている環境では
// ポリフィルは不要だが、一部環境で未定義となる場合があるため安全側に倒して実装する。
// 実行時の `vi` は Vitest の実際のインスタンスを参照するため、この型拡張は
// 型補完のみを目的とする（循環参照回避のため typeof vitestVi は使用しない）。

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

declare global {
  var vi: {
    stubEnv?: typeof stubEnv;
    unstubAllEnvs?: typeof unstubAllEnvs;
  };
}

if (typeof globalThis.vi !== 'undefined' && globalThis.vi) {
  if (!globalThis.vi.stubEnv) {
    globalThis.vi.stubEnv = stubEnv;
  }
  if (!globalThis.vi.unstubAllEnvs) {
    globalThis.vi.unstubAllEnvs = unstubAllEnvs;
  }
}
