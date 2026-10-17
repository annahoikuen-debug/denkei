import { describe, expect, it } from 'vitest';
import { CONTRACT_TEMPLATES_META } from './contract-templates-meta';

describe('3大契約書ひな形メタデータ (contract-templates-meta)', () => {
  it('業務委託・NDA・売買の3種類すべてが定義されている', () => {
    expect(CONTRACT_TEMPLATES_META.service).toBeDefined();
    expect(CONTRACT_TEMPLATES_META.nda).toBeDefined();
    expect(CONTRACT_TEMPLATES_META.sales).toBeDefined();
  });

  it('各テンプレートに変数が最低2つ以上設定されている', () => {
    Object.values(CONTRACT_TEMPLATES_META).forEach((meta) => {
      expect(meta.variables.length).toBeGreaterThanOrEqual(2);
      expect(meta.highlightPoints.length).toBeGreaterThanOrEqual(3);
      expect(meta.articleCount).toBeGreaterThan(0);
      expect(meta.sampleClause.title).toBeDefined();
    });
  });

  it('変数を差し込んだ全文プレビューが正常に展開される', () => {
    const servicePreview = CONTRACT_TEMPLATES_META.service.fullTextPreview({
      party_a: '株式会社アルファ',
      party_b: 'ベータ工房',
      amount: '500,000円',
    });

    expect(servicePreview).toContain('株式会社アルファ');
    expect(servicePreview).toContain('ベータ工房');
    expect(servicePreview).toContain('500,000円');
    expect(servicePreview).toContain('損害賠償上限');
  });

  it('空変数の場合にフォールバック文字列で安全に展開される', () => {
    const ndaPreview = CONTRACT_TEMPLATES_META.nda.fullTextPreview({});
    expect(ndaPreview).toContain('【甲】');
    expect(ndaPreview).toContain('【乙】');
    expect(ndaPreview).toContain('秘密保持契約書');
  });
});
