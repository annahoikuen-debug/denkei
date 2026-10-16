import { describe, expect, it } from 'vitest';
import {
  buildCompleteComplianceKitText,
  buildCompliancePrintHtml,
  buildElectronicLedgerRegulationDocument,
  NTA_COMPLIANCE_CHECKLIST,
} from './compliance-kit';

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

  it('完全パックテキスト (buildCompleteComplianceKitText) が規程とチェックリストを両方含む', () => {
    const completeKit = buildCompleteComplianceKitText({
      companyName: '株式会社サンプルテスト',
      representativeName: '代表取締役 佐藤 次郎',
    });

    expect(completeKit).toContain('電子帳簿保存法 コンプライアンス・キット（完全パック）');
    expect(completeKit).toContain('第1部: 電子取引データの訂正及び削除の防止に関する事務処理規程');
    expect(completeKit).toContain('第2部: 国税庁 電子帳簿保存法 要件充足チェックリスト');
    expect(completeKit).toContain('株式会社サンプルテスト');
    expect(completeKit).toContain('充足 (Pass)');
  });

  it('印刷用HTML (buildCompliancePrintHtml) がA4印刷用CSSと別紙チェックリストを含む', () => {
    const html = buildCompliancePrintHtml({
      companyName: '株式会社テスト印刷',
      representativeName: '代表取締役 鈴木 一郎',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('size: A4 portrait');
    expect(html).toContain('株式会社テスト印刷');
    expect(html).toContain('別紙：国税庁電子帳簿保存法 要件充足チェックリスト');
    expect(html).toContain('window.print()');
  });
});
