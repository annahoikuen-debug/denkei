import { DocumentAuth, type TRecipientAccessAuthTypes } from '@documenso/lib/types/document-auth';
import { joinJapaneseName } from '@documenso/lib/universal/japanese-name';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { RecipientRole } from '@prisma/client';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { useCurrentTeam } from '~/providers/team';

import { WizardProgress } from './_index';

/**
 * フェーズ1 ステップ15: 3ステップ送信ウィザード - ステップ2(宛先入力)
 *
 * 姓/名/メールのシンプル入力 + 署名順(先方→自社/自社→先方/同時)を選択。
 * 氏名は「姓 名」順で結合して登録する。
 *
 * C-4 修正: 宛先情報(PII)を URL クエリで次ステップへ引き渡さない。
 * ここでエンベロープに宛先を保存し、次ステップへは envelopeId のみを渡す。
 */
const ZRecipientFormSchema = z.object({
  sei: z.string().trim().min(1, '姓を入力してください'),
  mei: z.string().trim().min(1, '名を入力してください'),
  email: z.string().trim().email('有効なメールアドレスを入力してください'),
  signingOrderMode: z.enum(['counterparty-first', 'company-first', 'parallel']),
  // フェーズ2 ステップ12: 本人確認レベル(低/中/高)
  verificationLevel: z.enum(['none', 'low', 'medium', 'high']),
});

export type TWizardRecipient = z.infer<typeof ZRecipientFormSchema>;

/**
 * ウィザードの本人確認レベルを受取人の accessAuth 設定へ変換する。
 * 'high'(eKYC) はフェーズ2 ステップ10で外部APIが未接続のため、当面はメールOTPにフォールバックする。
 */
const VERIFICATION_LEVEL_TO_ACCESS_AUTH: Record<TWizardRecipient['verificationLevel'], TRecipientAccessAuthTypes[]> = {
  none: [],
  low: [DocumentAuth.EMAIL_OTP],
  medium: [DocumentAuth.FIREBASE_EMAIL],
  high: [DocumentAuth.EMAIL_OTP],
};

export default function WizardStepRecipientsPage() {
  const { _ } = useLingui();
  const { toast } = useToast();
  const navigate = useNavigate();
  const team = useCurrentTeam();
  const [searchParams] = useSearchParams();

  const envelopeId = searchParams.get('envelopeId') ?? '';

  const [sei, setSei] = useState('');
  const [mei, setMei] = useState('');
  const [email, setEmail] = useState('');
  const [signingOrderMode, setSigningOrderMode] = useState<TWizardRecipient['signingOrderMode']>('counterparty-first');
  const [verificationLevel, setVerificationLevel] = useState<TWizardRecipient['verificationLevel']>('low');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutateAsync: createRecipients, isPending: isSavingRecipients } =
    trpc.envelope.recipient.createMany.useMutation();

  // ステップ1を経由せずアクセスした場合はウィザードの先頭へ戻す。
  if (!envelopeId) {
    return <Navigate to={`/t/${team.url}/new`} replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = ZRecipientFormSchema.safeParse({
      sei,
      mei,
      email,
      signingOrderMode,
      verificationLevel,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');

        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }

      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const fullName = joinJapaneseName({ sei: parsed.data.sei, mei: parsed.data.mei });

    try {
      // 宛先(PII)はここでエンベロープに保存し、URL には載せない。
      await createRecipients({
        envelopeId,
        data: [
          {
            email: parsed.data.email,
            name: fullName,
            role: RecipientRole.SIGNER,
            signingOrder: 1,
            accessAuth: VERIFICATION_LEVEL_TO_ACCESS_AUTH[parsed.data.verificationLevel],
          },
        ],
      });
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);

      if (errMessage.includes('EMAIL_ADDRESS_ALREADY_IN_USE') || errMessage.includes('already')) {
        setErrors({ email: 'このメールアドレスは既に登録されています' });
        return;
      }

      toast({
        title: _(msg`宛先の保存に失敗しました`),
        description: _(msg`入力内容を確認してもう一度お試しください。`),
        variant: 'destructive',
      });

      return;
    }

    // 次ステップへは envelopeId のみを渡す(PII は URL に含めない)。
    void navigate(`/t/${team.url}/new/fields?envelopeId=${envelopeId}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-semibold text-2xl">
          <Trans>宛先を入力</Trans>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          <Trans>ステップ 2/3: 署名者の情報を入力してください</Trans>
        </p>
      </div>

      <WizardProgress currentStep={2} />

      <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="wizard-sei">
              <Trans>姓</Trans>
            </Label>
            <Input
              id="wizard-sei"
              name="sei"
              value={sei}
              onChange={(e) => setSei(e.target.value)}
              data-testid="wizard-sei"
              autoComplete="family-name"
            />
            {errors.sei && <p className="mt-1 text-destructive text-sm">{errors.sei}</p>}
          </div>

          <div>
            <Label htmlFor="wizard-mei">
              <Trans>名</Trans>
            </Label>
            <Input
              id="wizard-mei"
              name="mei"
              value={mei}
              onChange={(e) => setMei(e.target.value)}
              data-testid="wizard-mei"
              autoComplete="given-name"
            />
            {errors.mei && <p className="mt-1 text-destructive text-sm">{errors.mei}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="wizard-email">
            <Trans>メールアドレス</Trans>
          </Label>
          <Input
            id="wizard-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="wizard-email"
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-destructive text-sm">{errors.email}</p>}
        </div>

        <div>
          <Label>
            <Trans>本人確認レベル</Trans>
          </Label>
          <div className="mt-2 flex flex-col gap-2" data-testid="wizard-verification-level">
            {(
              [
                { value: 'none', label: '本人確認なし(即時に署名可能)' },
                { value: 'low', label: '低: メール確認コード(OTP)' },
                { value: 'medium', label: '中: メールリンク認証(Firebase)' },
                { value: 'high', label: '高: eKYC(書類+自撮り)' },
              ] as const
            ).map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="verificationLevel"
                  value={option.value}
                  checked={verificationLevel === option.value}
                  onChange={() => setVerificationLevel(option.value)}
                  data-testid={`wizard-verification-${option.value}`}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>
            <Trans>署名順</Trans>
          </Label>
          <div className="mt-2 flex flex-col gap-2">
            {(
              [
                { value: 'counterparty-first', label: '先方 → 自社' },
                { value: 'company-first', label: '自社 → 先方' },
                { value: 'parallel', label: '同時に署名' },
              ] as const
            ).map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="signingOrderMode"
                  value={option.value}
                  checked={signingOrderMode === option.value}
                  onChange={() => setSigningOrderMode(option.value)}
                  data-testid={`wizard-order-${option.value}`}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {errors.form && <p className="text-destructive text-sm">{errors.form}</p>}

        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            <Trans>戻る</Trans>
          </Button>
          <Button type="submit" data-testid="wizard-step2-next" loading={isSavingRecipients}>
            <Trans>次へ</Trans>
          </Button>
        </div>
      </form>
    </div>
  );
}
