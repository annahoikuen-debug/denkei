/**
 * 3大定型契約書（業務委託・NDA・売買）のメタデータ・条文サマリー・差し込み変数定義
 */

export type ContractTemplateKey = 'service' | 'nda' | 'sales';

export type ContractTemplateMeta = {
  key: ContractTemplateKey;
  title: string;
  shortName: string;
  badge: string;
  badgeColor: string;
  description: string;
  highlightPoints: string[];
  articleCount: number;
  variables: {
    name: string;
    label: string;
    placeholder: string;
    defaultValue: string;
  }[];
  sampleClause: {
    title: string;
    content: string;
  };
  fullTextPreview: (vars: Record<string, string>) => string;
};

export const CONTRACT_TEMPLATES_META: Record<ContractTemplateKey, ContractTemplateMeta> = {
  service: {
    key: 'service',
    title: '業務委託基本契約書（標準ひな形）',
    shortName: '業務委託契約',
    badge: '1番人気',
    badgeColor: 'bg-red-500/10 text-red-600 border-red-500/30',
    description: 'フリーランス・制作外注・コンサルタントとの受委託に適したトラブル防止の決定版。',
    highlightPoints: [
      '成果物の著作権・知的財産の明確な帰属規定',
      '受託者の過度な責任を防ぐ「損害賠償額の上限」条項つき',
      '検査期間および不合格時の追完請求フロー',
    ],
    articleCount: 14,
    variables: [
      { name: 'party_a', label: '甲（委託者）', placeholder: '株式会社デンケイ', defaultValue: '株式会社デンケイ' },
      { name: 'party_b', label: '乙（受託者）', placeholder: '相手方企業・屋号', defaultValue: 'パートナー合同会社' },
      { name: 'amount', label: '委託報酬（月額・税抜）', placeholder: '300,000円', defaultValue: '300,000円' },
    ],
    sampleClause: {
      title: '第8条（損害賠償の上限）',
      content:
        '甲又は乙が本契約に違反して相手方に損害を与えた場合、その賠償額は直接かつ通常の現実に生じた損害に限り、直近3ヶ月間に乙が受領した委託料の総額を上限とする。',
    },
    fullTextPreview: (vars) => {
      const partyA = vars.party_a || '【委託者】';
      const partyB = vars.party_b || '【受託者】';
      const amount = vars.amount || '〇〇円';
      return `業務委託基本契約書

${partyA}（以下「甲」という）と、${partyB}（以下「乙」という）とは、甲が乙に対して委託する業務に関し、以下の通り基本契約を締結する。

第1条（目的）
甲は乙に対し、別紙個別契約に定める業務を委託し、乙はこれを受託して誠実に遂行する。

第2条（個別契約）
個別契約には、業務内容、納期、委託報酬、支払期日等を定める。

第3条（委託報酬）
本契約に基づく業務委託料は月額金 ${amount}（消費税別）とし、甲は翌月末日までに乙の指定口座に振り込んで支払う。

第4条（知的財産権の帰属）
本件業務の遂行により生じた成果物に関する著作権等の知的財産権は、委託報酬の完済をもって乙から甲に移転する。ただし、乙が従前から保有していた汎用技術等は乙に留保される。

第5条（損害賠償上限）
甲または乙の債務不履行に基づく損害賠償の累計上限額は、直近3ヶ月に支払われた委託報酬相当額とする。

第6条（電帳法および電磁的記録の証跡）
本契約は電子署名法第2条・第3条に基づき電磁的記録として作成され、国税庁公認の事務処理規程に基づき法定期間保存される。

締結日：令和8年〇月〇日
甲：${partyA}
乙：${partyB}`;
    },
  },

  nda: {
    key: 'nda',
    title: '秘密保持契約書（NDA・双務開示型）',
    shortName: '秘密保持契約(NDA)',
    badge: '商談前の必須書式',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    description: '新事業の協議・業務提携・M&A検討で双方が安心して情報を開示し合える標準NDA。',
    highlightPoints: [
      '双方が平等に情報開示・保護義務を負う双務型規定',
      '公知情報・独自開発情報の明確な除外基準',
      '検討終了時の機密データの返還・破棄義務',
    ],
    articleCount: 11,
    variables: [
      { name: 'party_a', label: '甲（開示者）', placeholder: '株式会社デンケイ', defaultValue: '株式会社デンケイ' },
      { name: 'party_b', label: '乙（受領者）', placeholder: '相手方企業名', defaultValue: '提携候補株式会社' },
      { name: 'period', label: '秘密保持期間', placeholder: '契約締結より2年間', defaultValue: '締結日より2年間' },
    ],
    sampleClause: {
      title: '第3条（秘密情報の定義及び除外）',
      content:
        '秘密情報とは、開示当事者が秘密である旨を明示して開示された技術・営業・財務上の情報をいう。ただし、開示時に既に公知であった情報等は除外される。',
    },
    fullTextPreview: (vars) => {
      const partyA = vars.party_a || '【甲】';
      const partyB = vars.party_b || '【乙】';
      const period = vars.period || '2年間';
      return `秘密保持契約書

${partyA}（以下「甲」という）と、${partyB}（以下「乙」という）とは、両社間の業務提携の検討（以下「本目的」という）に際し、開示される機密情報の取扱いについて以下の通り合意する。

第1条（目的）
両当事者は、本目的の検討のために相互に秘密情報を開示し合う。

第2条（秘密保持義務）
受領当事者は、開示当事者の書面による事前承諾なく、秘密情報を第三者に開示または漏洩してはならない。

第3条（目的外利用の禁止）
受領当事者は、秘密情報を本目的以外のいかなる用途にも利用してはならない。

第4条（有効期間）
本契約に基づく秘密保持義務は、契約締結日より ${period} 有効とする。

第5条（電子契約締結）
本契約はクラウド事業者型電子署名を用いて電子的に締結され、改ざん防止ハッシュが付与される。

締結日：令和8年〇月〇日
甲：${partyA}
乙：${partyB}`;
    },
  },

  sales: {
    key: 'sales',
    title: '物品売買契約書（継続・スポット対応）',
    shortName: '売買契約書',
    badge: '確実な代金回収',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    description: '製品・機材・商品の売買取引における引渡しと所有権移転、契約不適合責任を網羅。',
    highlightPoints: [
      '代金完済時まで所有権を留保する「所有権留保」特約',
      '民法改正に対応した「契約不適合責任（旧瑕疵担保責任）」',
      '支払遅延時の法定遅延損害金（年3%）規定',
    ],
    articleCount: 12,
    variables: [
      { name: 'party_a', label: '甲（売主）', placeholder: '株式会社デンケイ', defaultValue: '株式会社デンケイ' },
      { name: 'party_b', label: '乙（買主）', placeholder: '相手方企業名', defaultValue: '購買商事株式会社' },
      { name: 'amount', label: '売買代金（総額）', placeholder: '1,500,000円', defaultValue: '1,500,000円' },
    ],
    sampleClause: {
      title: '第5条（所有権の移転及び危険負担）',
      content:
        '目的物の所有権は、乙が甲に対して売買代金を完済した時に甲から乙に移転する。引渡し前の滅失・毀損は甲の負担とし、引渡し後は乙の負担とする。',
    },
    fullTextPreview: (vars) => {
      const partyA = vars.party_a || '【売主】';
      const partyB = vars.party_b || '【買主】';
      const amount = vars.amount || '金〇〇円';
      return `物品売買契約書

売主 ${partyA}（以下「甲」という）と、買主 ${partyB}（以下「乙」という）とは、物品の売買に関して以下の通り契約を締結する。

第1条（売買の成立）
甲は乙に対し、仕様書記載の目的物を売り渡し、乙はこれを買い受ける。

第2条（売買代金）
本契約の売買総代金は金 ${amount}（消費税等別）とする。

第3条（引渡し及び検査）
甲は指定期日までに指定場所へ目的物を納品し、乙は受領後7日以内に検査を行う。

第4条（所有権移転）
目的物の所有権は、売買代金の全額が完済された時に乙に移転する。

第5条（契約不適合責任）
目的物に契約内容との不適合がある場合、乙は引渡し後1年以内に限り修補または代替物の引渡しを請求できる。

締結日：令和8年〇月〇日
売主（甲）：${partyA}
買主（乙）：${partyB}`;
    },
  },
};
