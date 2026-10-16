import { LandingPage } from '~/components/general/landing-page';

export function meta() {
  return [
    { title: 'デンケイ (Denkei) | 中小企業特化・月額2,980円の電子契約サービス' },
    {
      name: 'description',
      content:
        'タイムスタンプ不要で電帳法に完全適合。月額2,980円で100件まで定額。国税庁準拠の事務処理規程キット同梱、スマホ親指10秒で本物の認印（電子印影）を押印。日本のビジネスに一番割り切れる電子契約サービス。',
    },
  ];
}

export default function LpRoute() {
  return <LandingPage />;
}
