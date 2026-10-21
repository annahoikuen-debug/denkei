// vitest v4 互換性レイヤー: stubEnv / unstubAllEnvs の polyfill
import { vi } from 'vitest';

if (typeof vi.stubEnv === 'undefined') {
    (vi as any).stubEnv = (key: string, value: string | undefined) => {
        const original = process.env[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
        return {
            restore: () => {
                if (original === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = original;
                }
            },
        };
    };
}

if (typeof vi.unstubAllEnvs === 'undefined') {
    (vi as any).unstubAllEnvs = () => { };
}
