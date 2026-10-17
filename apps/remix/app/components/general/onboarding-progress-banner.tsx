import {
  calculateOnboardingProgress,
  getOnboardingSteps,
  type OnboardingState,
} from '@documenso/lib/universal/onboarding-checklist';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import { ArrowRight, CheckCircle2, ChevronRight, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

export type OnboardingProgressBannerProps = {
  teamUrl: string;
  hasSentDocuments?: boolean;
};

export const OnboardingProgressBanner: React.FC<OnboardingProgressBannerProps> = ({
  teamUrl,
  hasSentDocuments = false,
}) => {
  const storageKey = `denkei_onboarding_${teamUrl}`;
  const dismissedKey = `denkei_onboarding_dismissed_${teamUrl}`;

  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    company_info: true,
    seal_preview: false,
    compliance_kit: false,
    first_send: hasSentDocuments,
  });

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(dismissedKey) === 'true';
      if (isDismissed) {
        setDismissed(true);
      }
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<OnboardingState>;
        setState((prev) => ({
          ...prev,
          ...parsed,
          first_send: hasSentDocuments || !!parsed.first_send,
        }));
      } else if (hasSentDocuments) {
        setState((prev) => ({ ...prev, first_send: true }));
      }
    } catch {
      // localStorage unavailable fallback
    }
  }, [teamUrl, hasSentDocuments, storageKey, dismissedKey]);

  const handleStepClick = (stepId: keyof OnboardingState) => {
    setState((prev) => {
      const updated = { ...prev, [stepId]: true };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedKey, 'true');
    } catch {
      // ignore
    }
  };

  if (dismissed) {
    return null;
  }

  const progress = calculateOnboardingProgress(state);
  const steps = getOnboardingSteps(state);

  return (
    <Card className="mb-8 overflow-hidden rounded-2xl border-2 border-red-500/30 bg-gradient-to-r from-red-500/5 via-card to-amber-500/5 shadow-md">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 font-black text-white text-xs shadow">
                必
              </span>
              <div>
                <h3 className="font-black text-base text-foreground sm:text-lg">
                  初期セットアップ進行ガイド（所要時間：3分）
                </h3>
                <p className="text-muted-foreground text-xs">
                  4つのステップを完了すると、最初の契約書を安心して取引先に送信できます。
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-black text-red-600 text-sm">進捗 {progress.percentage}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="閉じる"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-600 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* 4ステップカードグリッド */}
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const href = step.actionHref(teamUrl);

              return (
                <div
                  key={step.id}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                    step.isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                      : 'border-border bg-card/80 hover:border-red-500/40'
                  }`}
                >
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-bold text-[11px] text-muted-foreground">Step {step.stepNumber}</span>
                      {step.isCompleted ? (
                        <span className="flex items-center gap-1 font-bold text-[10px] text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          完了
                        </span>
                      ) : (
                        <span className="font-bold text-[10px] text-amber-600">未完了</span>
                      )}
                    </div>
                    <div className="font-bold text-foreground text-xs sm:text-sm">{step.title}</div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{step.description}</p>
                  </div>

                  <div className="mt-3 border-border/60 border-t pt-2">
                    <Link
                      to={href}
                      onClick={() => handleStepClick(step.id)}
                      className="inline-flex items-center gap-1 font-bold text-red-600 text-xs hover:text-red-700"
                    >
                      <span>{step.actionLabel}</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 100%達成時の祝福カード */}
          {progress.isAllCompleted && (
            <div className="fade-in mt-2 flex animate-in flex-col items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-900 text-xs sm:flex-row dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <span className="font-bold">
                  おめでとうございます！すべての基本準備が完了しました。貴社の電子契約体制は100%整っています。
                </span>
              </div>
              <Link to={`/t/${teamUrl}/new`}>
                <Button
                  size="sm"
                  className="whitespace-nowrap bg-emerald-600 font-bold text-white text-xs hover:bg-emerald-700"
                >
                  本番の契約書を作成する
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
