/**
 * 電子帳簿保存法・税務署対応 適合チェック診断ロジック
 *
 * 中小企業が最も不安に感じる「高額なタイムスタンプがなくても本当に適法か？」
 * を3つの質問で診断し、国税庁の法令（施行規則第3条・第4条・第7条）に基づく
 * 適法根拠と、デンケイが提供する「事務処理規程」での解決策を明示する。
 */

export type DiagnosticAnswers = {
  /** Q1: 取引先との契約書のやりとり方法 ('pdf' | 'paper' | 'both') */
  contractType: 'pdf' | 'paper' | 'both';
  /** Q2: 現在のタイムスタンプ導入状況 ('none' | 'expensive' | 'not_sure') */
  timestampStatus: 'none' | 'expensive' | 'not_sure';
  /** Q3: 社内の事務処理規程の備付け状況 ('ready' | 'none' | 'unknown') */
  regulationStatus: 'ready' | 'none' | 'unknown';
};

export type DiagnosticResult = {
  isFullyCompliant: boolean;
  score: number; // 0 - 100
  title: string;
  badgeText: string;
  badgeVariant: 'default' | 'warning' | 'secondary';
  recommendation: string;
  legalBasis: {
    law: string;
    article: string;
    summary: string;
    ntaOfficialGuide: string;
  };
  solutionPoints: string[];
};

export const evaluateCompliance = (answers: DiagnosticAnswers): DiagnosticResult => {
  // Q1: PDFや電子契約を扱う場合、電帳法第7条（電子取引データの保存義務）の対象
  const isElectronic = answers.contractType === 'pdf' || answers.contractType === 'both';

  // 事務処理規程があれば100%適法
  if (answers.regulationStatus === 'ready') {
    return {
      isFullyCompliant: true,
      score: 100,
      title: '適法クリア済：現在の運用で法的に問題ありません',
      badgeText: '電帳法 100% 適合',
      badgeVariant: 'default',
      recommendation:
        '貴社は事務処理規程を備え付けており、国税庁要件をクリアしています。デンケイを導入すれば、月額2,980円でタイムスタンプ代を永久ゼロにしつつ、監査ログ付きでさらに強固に保全できます。',
      legalBasis: {
        law: '電子計算機を使用して作成する国税関係帳簿書類の保存方法等の法律施行規則',
        article: '第4条第1項第4号（事務処理規程の備付け）',
        summary:
          '訂正及び削除の防止に関する事務処理規程を定めて備え付けている場合は、タイムスタンプの付与要件に代えることができる。',
        ntaOfficialGuide: '国税庁「電子帳簿保存法一問一答（電子取引関係）問24」',
      },
      solutionPoints: [
        '高額なタイムスタンプ（1通数百円）の支払いは不要です',
        'デンケイなら月額2,980円で契約書の送受信・ハッシュ保全が完結',
        '税務調査時には規程と電子契約PDFを提示するだけでOK',
      ],
    };
  }

  // 規程がない場合、または未定の場合（典型的な中小企業）
  return {
    isFullyCompliant: false,
    score: isElectronic ? 40 : 60,
    title: '判定：事務処理規程の備付けで「即日100%適法」になります！',
    badgeText: '規程パックで即日適法化',
    badgeVariant: 'warning',
    recommendation:
      'タイムスタンプがなくても全く問題ありません！国税庁が認める「訂正削除防止に関する事務処理規程」を自社に1通備え付けるだけで、電帳法の真実性要件を100%適法にクリアできます。',
    legalBasis: {
      law: '電子帳簿保存法施行規則',
      article: '第4条第1項第4号（正当な理由がない訂正及び削除の防止に関する規程）',
      summary:
        'タイムスタンプの付与を行わない場合であっても、同号に規定する事務処理規程を作成し、適切に運用している場合には法令の保存要件を満たす。',
      ntaOfficialGuide: '国税庁「電子帳簿保存法取扱通達7-6及び一問一答」',
    },
    solutionPoints: [
      '大手システムのような高額タイムスタンプ月額基本料は一切不要',
      'デンケイの「中小応援プラン」なら、貴社名入りの国税庁公認規程PDFを1クリックで出力可能',
      '出力した規程をバインダーに綴じるだけで、今日の契約から税務調査に胸を張って対応できます',
    ],
  };
};
