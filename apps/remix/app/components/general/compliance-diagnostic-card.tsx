import {
  type DiagnosticAnswers,
  type DiagnosticResult,
  evaluateCompliance,
} from '@documenso/lib/universal/compliance-diagnostics';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import { CheckCircle2, ChevronRight, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router';

export const ComplianceDiagnosticCard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({
    contractType: 'both',
    timestampStatus: 'none',
    regulationStatus: 'none',
  });

  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const handleSelectContractType = (type: DiagnosticAnswers['contractType']) => {
    setAnswers((prev) => ({ ...prev, contractType: type }));
    setCurrentStep(2);
  };

  const handleSelectTimestamp = (status: DiagnosticAnswers['timestampStatus']) => {
    setAnswers((prev) => ({ ...prev, timestampStatus: status }));
    setCurrentStep(3);
  };

  const handleSelectRegulation = (status: DiagnosticAnswers['regulationStatus']) => {
    const finalAnswers: DiagnosticAnswers = { ...answers, regulationStatus: status };
    setAnswers(finalAnswers);
    const evalResult = evaluateCompliance(finalAnswers);
    setResult(evalResult);
    setCurrentStep(4);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setResult(null);
  };

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-border shadow-xl">
      <div className="border-border border-b bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-black text-base tracking-tight sm:text-lg">
              30秒でわかる！電帳法・税務署対応 適合チェック診断
            </span>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-bold text-xs">
            {currentStep <= 3 ? `質問 ${currentStep} / 3` : '診断結果'}
          </span>
        </div>
      </div>

      <CardContent className="p-6 sm:p-8">
        {/* ステップ1: 契約書の形式 */}
        {currentStep === 1 && (
          <div className="fade-in animate-in space-y-5 duration-300">
            <div>
              <span className="font-extrabold text-red-600 text-xs">質問 1</span>
              <h3 className="mt-1 font-black text-foreground text-xl">
                現在、お取引先との契約書や発注書はどのように取り交わしていますか？
              </h3>
              <p className="mt-1 text-muted-foreground text-xs">
                ※ PDFのメール送信・クラウド受信などがある場合、電帳法の「電子取引」対象です。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleSelectContractType('both')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">紙とPDFが混在</span>
                <span className="mt-1 text-[11px] text-muted-foreground">最も多いパターン</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectContractType('pdf')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">ほぼPDF（電子契約）</span>
                <span className="mt-1 text-[11px] text-muted-foreground">メールやWebで送受</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectContractType('paper')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">ほぼ紙（郵送・ハンコ）</span>
                <span className="mt-1 text-[11px] text-muted-foreground">これから電子化を検討</span>
              </button>
            </div>
          </div>
        )}

        {/* ステップ2: タイムスタンプ状況 */}
        {currentStep === 2 && (
          <div className="fade-in animate-in space-y-5 duration-300">
            <div>
              <span className="font-extrabold text-red-600 text-xs">質問 2</span>
              <h3 className="mt-1 font-black text-foreground text-xl">
                高額な「認定タイムスタンプ（1通100〜220円）」を利用していますか？
              </h3>
              <p className="mt-1 text-muted-foreground text-xs">
                ※ 大手電子契約サービスではタイムスタンプ代や基本料が課金されます。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleSelectTimestamp('none')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">利用していない（0円）</span>
                <span className="mt-1 text-[11px] text-muted-foreground">余計な費用は払いたくない</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTimestamp('expensive')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">大手に支払っている</span>
                <span className="mt-1 text-[11px] text-muted-foreground">毎月のコストが高い</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTimestamp('not_sure')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">よくわからない</span>
                <span className="mt-1 text-[11px] text-muted-foreground">タイムスタンプの意味が不明</span>
              </button>
            </div>
          </div>
        )}

        {/* ステップ3: 事務処理規程の備付け */}
        {currentStep === 3 && (
          <div className="fade-in animate-in space-y-5 duration-300">
            <div>
              <span className="font-extrabold text-red-600 text-xs">質問 3</span>
              <h3 className="mt-1 font-black text-foreground text-xl">
                国税庁公認の「訂正削除防止に関する事務処理規程」を社内に備え付けていますか？
              </h3>
              <p className="mt-1 text-muted-foreground text-xs">
                ※ これさえあれば、タイムスタンプがなくても100%適法（国税庁公式認定）になります。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleSelectRegulation('none')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">備え付けていない</span>
                <span className="mt-1 text-[11px] text-muted-foreground">作り方がわからない</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRegulation('unknown')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">わからない・未定</span>
                <span className="mt-1 text-[11px] text-muted-foreground">規程という言葉を初めて聞いた</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRegulation('ready')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:border-red-600 hover:bg-red-50/20 active:scale-98"
              >
                <span className="font-black text-foreground text-sm">すでに作成・備付済</span>
                <span className="mt-1 text-[11px] text-muted-foreground">社内バインダーに保管</span>
              </button>
            </div>
          </div>
        )}

        {/* ステップ4: 診断結果 */}
        {currentStep === 4 && result && (
          <div className="fade-in animate-in space-y-6 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-2 border-border border-b pb-4">
              <Badge variant={result.badgeVariant} className="px-3 py-1 font-bold text-xs">
                {result.badgeText}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground text-xs">
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                もう一度診断する
              </Button>
            </div>

            <div>
              <h3 className="font-black text-foreground text-xl sm:text-2xl">{result.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{result.recommendation}</p>
            </div>

            {/* 法的根拠カード */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-red-600">
                <ShieldCheck className="h-4 w-4" />
                <span>国税庁の法令根拠（公認ルール）</span>
              </div>
              <div className="mt-1 font-bold text-foreground">
                {result.legalBasis.law} {result.legalBasis.article}
              </div>
              <p className="mt-1 text-muted-foreground">{result.legalBasis.summary}</p>
              <div className="mt-1.5 text-[11px] text-neutral-500">出典: {result.legalBasis.ntaOfficialGuide}</div>
            </div>

            {/* ソリューションポイント */}
            <div className="space-y-2">
              <div className="font-bold text-foreground text-xs">💡 デンケイならこう解決します:</div>
              <div className="space-y-1.5">
                {result.solutionPoints.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2 text-muted-foreground text-xs">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 有料プラン（規程パック）への導線 */}
            <div className="rounded-2xl border-2 border-red-600/40 bg-gradient-to-r from-red-600/10 via-amber-600/10 to-red-600/5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-black text-red-600 text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>貴社名入りの事務処理規程PDFを1クリック出力！</span>
                  </div>
                  <p className="mt-1 text-muted-foreground text-xs">
                    中小応援プラン（月額2,980円・100件込み）で、印刷・税務署対応セットがすぐ手に入ります。
                  </p>
                </div>
                <Link to="/signup" className="flex-shrink-0">
                  <Button className="h-11 bg-red-600 px-6 font-bold text-white shadow-md hover:bg-red-700">
                    規程パックつきで申し込む
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
