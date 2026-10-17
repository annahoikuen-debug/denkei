import { describe, expect, it } from 'vitest';
import {
  buildCounterpartyEmailTemplate,
  buildCounterpartyNoticeText,
  buildCounterpartyPrintHtml,
} from './counterparty-guide';

describe('取引先（相手方）向け案内キット (counterparty-guide)', () => {
  it('オプション指定値が正しく差し込まれた案内書面テキストを生成できる', () => {
    const text = buildCounterpartyNoticeText({
      companyName: '株式会社テスト商事',
      effectiveDate: '令和8年11月1日',
      contactEmail: 'support@test-shoji.co.jp',
      contactPhone: '03-1234-5678',
      serviceName: 'デンケイ',
    });

    expect(text).toContain('株式会社テスト商事');
    expect(text).toContain('令和8年11月1日');
    expect(text).toContain('support@test-shoji.co.jp');
    expect(text).toContain('03-1234-5678');
    expect(text).toContain('費用負担は一切ございません（完全無料）');
    expect(text).toContain('専用アプリのインストールやアカウント会員登録は不要です');
    expect(text).toContain('電子署名法第2条・第3条および民法第522条第2項');
  });

  it('空文字や未指定オプション時に適切なフォールバックが機能する', () => {
    const text = buildCounterpartyNoticeText({
      companyName: '',
    });

    expect(text).toContain('当社');
    expect(text).toContain('デンケイ（Denkei）');
    expect(text).toContain('近日中');
  });

  it('コピペ用メールテンプレートが件名・本文ともに正しく生成される', () => {
    const email = buildCounterpartyEmailTemplate({
      companyName: '合同会社パートナーズ',
      serviceName: 'デンケイ',
    });

    expect(email.subject).toContain('合同会社パートナーズ');
    expect(email.subject).toContain('デンケイ');
    expect(email.body).toContain('会員登録やアプリのインストールは不要です');
    expect(email.body).toContain('スマホ・PCで10秒程度で朱肉認印を押印いただけます');
  });

  it('A4印刷用HTMLが正しく生成され、主要な案内項目および印刷制御スタイルが含まれる', () => {
    const html = buildCounterpartyPrintHtml({
      companyName: '株式会社デンケイ工務店',
      effectiveDate: '2026年11月1日',
      contactEmail: 'info@denkei-koumuten.jp',
      contactPhone: '0120-000-000',
      serviceName: 'デンケイ',
      representativeName: '代表取締役 山田太郎',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('@page {');
    expect(html).toContain('size: A4 portrait');
    expect(html).toContain('株式会社デンケイ工務店');
    expect(html).toContain('代表取締役 山田太郎');
    expect(html).toContain('info@denkei-koumuten.jp');
    expect(html).toContain('① 費用は完全無料（0円）');
    expect(html).toContain('② アプリ・会員登録不要');
    expect(html).toContain('③ スマホで10秒・認印押印');
    expect(html).toContain('電子契約サービス導入に伴うお願いとお知らせ');
    expect(html).toContain('window.print()');
  });
});
