import { describe, expect, it } from 'vitest';
import { evaluateCompliance } from './compliance-diagnostics';

describe('電帳法適合チェック診断ロジック (compliance-diagnostics)', () => {
  it('事務処理規程がすでに備え付けられている場合は100%適法判定を返す', () => {
    const result = evaluateCompliance({
      contractType: 'pdf',
      timestampStatus: 'none',
      regulationStatus: 'ready',
    });

    expect(result.isFullyCompliant).toBe(true);
    expect(result.score).toBe(100);
    expect(result.badgeText).toContain('100% 適合');
    expect(result.legalBasis.article).toContain('第4条第1項第4号');
    expect(result.solutionPoints.length).toBeGreaterThan(0);
  });

  it('事務処理規程がない中小企業には規程備付けによる即日適法化アドバイスを返す', () => {
    const result = evaluateCompliance({
      contractType: 'both',
      timestampStatus: 'expensive',
      regulationStatus: 'none',
    });

    expect(result.isFullyCompliant).toBe(false);
    expect(result.title).toContain('事務処理規程の備付け');
    expect(result.badgeText).toContain('規程パックで即日適法化');
    expect(result.legalBasis.article).toContain('訂正及び削除の防止に関する規程');
    expect(result.legalBasis.summary).toContain('事務処理規程を作成し、適切に運用');
  });

  it('紙中心で運用しており電子化を検討中の場合も適切な条文とポイントを提示する', () => {
    const result = evaluateCompliance({
      contractType: 'paper',
      timestampStatus: 'not_sure',
      regulationStatus: 'unknown',
    });

    expect(result.legalBasis.ntaOfficialGuide).toBeDefined();
    expect(result.solutionPoints[0]).toContain('タイムスタンプ');
  });
});
