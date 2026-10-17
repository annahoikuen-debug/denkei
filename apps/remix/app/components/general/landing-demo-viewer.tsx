import { Button } from '@documenso/ui/primitives/button';
import { CheckCircle2, RotateCcw, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export type LandingDemoViewerProps = {
  sealName: string;
  sealColor: 'vermilion' | 'black' | 'navy';
  sealDataUrl: string;
  onStampSuccess?: (seconds: number) => void;
};

export const LandingDemoViewer: React.FC<LandingDemoViewerProps> = ({ sealName, sealDataUrl, onStampSuccess }) => {
  const [isStamped, setIsStamped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [startTime] = useState<number>(() => Date.now());
  const [stampedSeconds, setStampedSeconds] = useState<number>(0);

  const handleTapSealArea = () => {
    if (isStamped) {
      return;
    }

    setAnimating(true);
    const elapsed = Math.max(2, Math.min(10, Math.round((Date.now() - startTime) / 1000)));
    setStampedSeconds(elapsed);

    setTimeout(() => {
      setIsStamped(true);
      setAnimating(false);
      if (onStampSuccess) {
        onStampSuccess(elapsed);
      }
    }, 300);
  };

  const handleReset = () => {
    setIsStamped(false);
    setAnimating(false);
  };

  const todayStr = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border-4 border-neutral-800 bg-neutral-900 shadow-2xl">
      {/* スマホ風ヘッダーノッチバー */}
      <div className="flex items-center justify-between border-neutral-800 border-b bg-neutral-950 px-4 py-2 text-neutral-400 text-xs">
        <div className="flex items-center gap-1.5 font-bold">
          <Smartphone className="h-3.5 w-3.5 text-neutral-400" />
          <span>Denkei Mobile Web</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[11px] text-neutral-400">暗号化通信 (SSL)</span>
        </div>
      </div>

      {/* サンドボックス 契約書本体（スクロール枠） */}
      <div className="relative h-96 select-none overflow-y-auto bg-white p-5 text-neutral-800 dark:bg-white dark:text-neutral-900">
        {/* 電子契約ヘッダー */}
        <div className="border-neutral-200 border-b pb-3">
          <div className="flex items-center justify-between">
            <span className="rounded bg-red-600 px-1.5 py-0.5 font-black text-[10px] text-white tracking-wider">
              公式電子契約
            </span>
            <span className="font-mono text-[11px] text-neutral-500">ID: DK-2026-DEMO</span>
          </div>
          <h3 className="mt-2 text-center font-black text-base text-neutral-900 tracking-tight">
            秘密保持及び業務提携に関する覚書
          </h3>
          <p className="mt-1 text-center text-[10px] text-neutral-500">
            電子署名法第2条・第3条準拠（クラウド事業者型電子署名）
          </p>
        </div>

        {/* 契約条文サンプル */}
        <div className="mt-3 space-y-2 text-[11px] text-neutral-600 leading-relaxed">
          <p>
            株式会社デンケイ（以下「甲」という）と、相手方（以下「乙」という）とは、両社間の業務提携の検討に関して開示される秘密情報の取扱いについて、以下の通り合意する。
          </p>
          <div className="rounded bg-neutral-50 p-2 text-[10.5px]">
            <span className="font-bold text-neutral-700">第1条（目的）: </span>
            甲および乙は、相互の信頼に基づき、ペーパーレスおよび業務効率化に向けた協議を実施する。
          </div>
          <div className="rounded bg-neutral-50 p-2 text-[10.5px]">
            <span className="font-bold text-neutral-700">第2条（電帳法・事務処理規程）: </span>
            本契約の電磁的記録は、国税庁公認の事務処理規程およびハッシュチェーンにより法定期間厳格に保管される。
          </div>
        </div>

        {/* 署名・押印欄 */}
        <div className="mt-4 border-neutral-200 border-t pt-3">
          <div className="mb-2 text-[11px] text-neutral-500">締結日: {todayStr}</div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* 甲（デンケイ側） */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-2 text-center">
              <div className="font-bold text-[10px] text-neutral-500">甲（発信者）</div>
              <div className="mt-0.5 font-bold text-[11px] text-neutral-800">株式会社デンケイ</div>
              <div className="mt-2 flex justify-center">
                <div className="flex h-12 w-12 rotate-[-8deg] items-center justify-center rounded-full border-2 border-red-600/80 font-black text-[10px] text-red-600 shadow-sm">
                  株式会社
                  <br />
                  デンケイ
                </div>
              </div>
              <div className="mt-1 text-[9px] text-neutral-400">事前押印済</div>
            </div>

            {/* 乙（ユーザー体験側） */}
            <div
              onClick={handleTapSealArea}
              className={`relative cursor-pointer rounded-lg border-2 p-2 text-center transition-all ${
                isStamped
                  ? 'border-emerald-500 bg-emerald-50/40'
                  : 'border-red-500 border-dashed bg-red-50/50 hover:border-red-600 hover:bg-red-50 active:scale-98'
              }`}
            >
              <div className="font-bold text-[10px] text-neutral-500">乙（あなた様）</div>
              <div className="mt-0.5 font-bold text-[11px] text-neutral-800">
                {sealName ? `${sealName} 様` : '取引先 各位'}
              </div>

              <div className="mt-2 flex min-h-[48px] items-center justify-center">
                {isStamped ? (
                  <div className="relative">
                    <img
                      src={sealDataUrl}
                      alt={`${sealName}の印影`}
                      className={`h-12 w-12 select-none drop-shadow transition-transform duration-300 ${
                        animating ? 'rotate-[-12deg] scale-150' : 'rotate-[-3deg] scale-100'
                      }`}
                    />
                    <div className="absolute -right-1 -bottom-1 rounded-full bg-emerald-600 p-0.5 text-white shadow">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="relative">
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                      </span>
                      <div className="animate-bounce rounded-full border border-red-400 bg-white px-2 py-1 font-black text-[11px] text-red-600 shadow-sm">
                        ここをタップ！
                      </div>
                    </div>
                    <span className="mt-1 font-semibold text-[9px] text-red-500">10秒で認印を押印</span>
                  </div>
                )}
              </div>

              <div className="mt-1 text-[9px] text-neutral-500">
                {isStamped ? (
                  <span className="font-bold text-emerald-600">✓ 押印完了</span>
                ) : (
                  <span>未押印（要タップ）</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* アクションフッター */}
      <div className="border-neutral-800 border-t bg-neutral-950 p-4 text-center">
        {isStamped ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 font-bold text-emerald-400 text-xs">
              <Sparkles className="h-4 w-4" />
              <span>お見事！わずか {stampedSeconds} 秒で締結が完了しました</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-neutral-400 text-xs hover:text-white"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                もう一度試す
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>相手方の登録・費用ゼロ</span>
            </span>
            <span className="text-[11px] text-neutral-500">※ ブラウザ完結・保存なし</span>
          </div>
        )}
      </div>
    </div>
  );
};
