import { describe, expect, it } from 'vitest';
import { buildElectronicLedgerRegulationDocument, NTA_COMPLIANCE_CHECKLIST } from './compliance-kit';

describe('電子帳簿保存法 コンプライアンス・キット (compliance-kit)', () => {
  it('国税庁要件のチェックリストが正しく定義されている', () => {
    expect(NTA_COMPLIANCE_CHECKLIST.length).toBeGreaterThanOrEqual(4);

    const categories = NTA_COMPLIANCE_CHECKLIST.map((c) => c.category);
    expect(categories).toContain('TRUTHFULNESS');
    expect(categories).toContain('SEARCHABILITY');
    expect(categories).toContain('PRESERVATION');

    const ruleCheck = NTA_COMPLIANCE_CHECKLIST.find((c) => c.id === 'tamper-prevention-rules');
    expect(ruleCheck?.ntaRegulationArticle).toContain('施行規則第3条');
  });

  it('事務処理規程のテキストに会社名・制定日・管理責任者が反映される', () => {
    const text = buildElectronicLedgerRegulationDocument({
      companyName: '合同会社デンケイラボ',
      representativeName: '代表社員 山田 太郎',
      enactedDate: '2026年10月16日',
      adminManagerTitle: '最高法務責任者',
    });

    expect(text).toContain('合同会社デンケイラボ');
    expect(text).toContain('代表社員 山田 太郎');
    expect(text).toContain('2026年10月16日');
    expect(text).toContain('最高法務責任者');
    expect(text).toContain('電子取引データの訂正及び削除の防止に関する事務処理規程');
    expect(text).toContain('電子契約プラットフォーム「デンケイ」');
    expect(text).toContain('ハッシュチェーン');
    expect(text).toContain('原則として確定申告書の提出期限の翌日から７年間');
  });

  it('空文字やオプション未指定時は適切なデフォルト値を補完する', () => {
    const text = buildElectronicLedgerRegulationDocument({
      companyName: '',
    });

    expect(text).toContain('〇〇株式会社');
    expect(text).toContain('令和〇年〇月〇日');
    expect(text).toContain('代表取締役 〇〇 〇〇');
  });
});
