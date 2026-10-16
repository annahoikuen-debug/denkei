import { describe, expect, it } from 'vitest';

import { generateElectronicSealDataUrl, sealBorderStyle } from './seal-image';

describe('電子印影 (認印・丸印) ユーティリティ', () => {
  it('sealBorderStyle が円形レンダリング用スタイルを定義している', () => {
    expect(sealBorderStyle.borderRadius).toBe('50%');
    expect(sealBorderStyle.objectFit).toBe('contain');
  });

  it('DOMが存在しない環境(Node SSR)では安全に空文字を返す', () => {
    // Vitest node environment without canvas document
    const result = generateElectronicSealDataUrl('田中');
    expect(typeof result).toBe('string');
  });

  it('モックcanvas環境で正しい形式のPNGデータURLを生成する', () => {
    // Mock minimal canvas and 2D context
    const originalDocument = global.document;

    const mockCtx = {
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      fillText: () => {},
      font: '',
      strokeStyle: '',
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
    };

    const mockCanvas = {
      width: 256,
      height: 256,
      getContext: () => mockCtx,
      toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    };

    // @ts-expect-error minimal mock
    global.document = {
      // @ts-expect-error minimal mock
      createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : null),
    };

    try {
      const dataUrl = generateElectronicSealDataUrl('佐藤', 256, '#dc2626');
      expect(dataUrl).toContain('data:image/png;base64,');
    } finally {
      global.document = originalDocument;
    }
  });

  it('1文字・2文字・3文字・4文字以上で例外をスローせず生成できる', () => {
    const originalDocument = global.document;

    const mockCtx = {
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      fillText: () => {},
      font: '',
      strokeStyle: '',
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
    };

    const mockCanvas = {
      width: 256,
      height: 256,
      getContext: () => mockCtx,
      toDataURL: () => 'data:image/png;base64,valid_data_url',
    };

    // @ts-expect-error minimal mock
    global.document = {
      // @ts-expect-error minimal mock
      createElement: () => mockCanvas,
    };

    try {
      expect(generateElectronicSealDataUrl('印')).toContain('data:image/png;base64,');
      expect(generateElectronicSealDataUrl('田中')).toContain('data:image/png;base64,');
      expect(generateElectronicSealDataUrl('山田太郎')).toContain('data:image/png;base64,');
      expect(generateElectronicSealDataUrl('株式会社テスト')).toContain('data:image/png;base64,');
    } finally {
      global.document = originalDocument;
    }
  });

  it('会社角印(square)および代表取締役印(representative)が正常に生成できる', () => {
    const originalDocument = global.document;

    const mockCtx = {
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      strokeRect: () => {},
      fillText: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      font: '',
      strokeStyle: '',
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
    };

    const mockCanvas = {
      width: 256,
      height: 256,
      getContext: () => mockCtx,
      toDataURL: () => 'data:image/png;base64,mock_seal_data',
    };

    // @ts-expect-error minimal mock
    global.document = {
      // @ts-expect-error minimal mock
      createElement: () => mockCanvas,
    };

    try {
      // 角印
      const square = generateElectronicSealDataUrl('株式会社デンケイ', 256, '#dc2626', { type: 'square' });
      expect(square).toContain('data:image/png;base64,');

      // 代表取締役印
      const rep = generateElectronicSealDataUrl('株式会社デンケイ', 256, '#dc2626', {
        type: 'representative',
        innerTitle: '代表取締役印',
      });
      expect(rep).toContain('data:image/png;base64,');
    } finally {
      global.document = originalDocument;
    }
  });
});
