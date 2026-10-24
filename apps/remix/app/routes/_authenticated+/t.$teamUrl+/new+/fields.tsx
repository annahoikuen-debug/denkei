import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Label } from '@documenso/ui/primitives/label';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { RecipientRole } from '@prisma/client';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';

import { useCurrentTeam } from '~/providers/team';

import { WizardProgress } from './_index';

/**
 * フェーズ1 ステップ16・17: 3ステップ送信ウィザード - ステップ3(フィールド配置・確認・送信)
 *
 * 簡易モード: 署名(SIGNATURE)+日付(DATE)を自動配置。
 * 詳細モードへの切替リンクで既存エディタ(`documents.$id.edit`)へ移行。
 * 送信前確認サマリ(宛先・件名)を表示して送信する。
 *
 * C-4 修正:
 * - 宛先情報(PII)はステップ2でエンベロープに保存済みのため、URL からではなく
 *   エンベロープ取得(envelope.get)経由で表示する。
 * - 「送信」ボタンを実装し、フィールド自動配置 → 送信(envelope.distribute)を行う。
 */
export default function WizardStepFieldsPage() {
  const { _ } = useLingui();
  const { toast } = useToast();
  const navigate = useNavigate();
  const team = useCurrentTeam();
  const [searchParams] = useSearchParams();

  const envelopeId = searchParams.get('envelopeId') ?? '';

  const [isSending, setIsSending] = useState(false);

  // フェーズ2 ステップ25・27: リマインダー・有効期限の設定状態
  // (自動送信ジョブへの反映は envelope automation 設定の保存ルート実装後に接続する)
  const [expirationDays, setExpirationDays] = useState('14');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderIntervalDays, setReminderIntervalDays] = useState('3');
  const [reminderMaxCount, setReminderMaxCount] = useState('3');

  const { data: envelope, isLoading: isLoadingEnvelope } = trpc.envelope.get.useQuery(
    { envelopeId },
    { enabled: Boolean(envelopeId) },
  );

  const { mutateAsync: createFields } = trpc.envelope.field.createMany.useMutation();
  const { mutateAsync: distributeEnvelope } = trpc.envelope.distribute.useMutation();

  const expirationLabel = expirationDays === 'none' ? '無期限' : `送信から${expirationDays}日後`;

  // ステップ2を経由せずアクセスした場合は宛先入力へ戻す。
  if (!envelopeId) {
    return <Navigate to={`/t/${team.url}/new/recipients`} replace />;
  }

  const signer =
    envelope?.recipients.find((recipient) => recipient.role === RecipientRole.SIGNER) ?? envelope?.recipients[0];

  const onSend = async () => {
    if (!envelopeId || !signer) {
      return;
    }

    try {
      setIsSending(true);

      // 簡易モード: 1ページ目に署名欄と日付を自動配置する(% ベースの座標)。
      await createFields({
        envelopeId,
        data: [
          {
            type: 'SIGNATURE',
            recipientId: signer.id,
            page: 1,
            positionX: 30,
            positionY: 50,
            width: 40,
            height: 12,
          },
          {
            type: 'DATE',
            recipientId: signer.id,
            page: 1,
            positionX: 30,
            positionY: 68,
            width: 40,
            height: 8,
          },
        ],
      });

      // 送信。文書のタイムゾーンは日本時間を既定とする。
      await distributeEnvelope({
        envelopeId,
        meta: {
          timezone: 'Asia/Tokyo',
        },
      });

      toast({
        title: _(msg`契約書を送信しました`),
        description: _(msg`${signer.email} 宛に署名依頼メールを送信しました。`),
      });

      void navigate(`/t/${team.url}/documents`);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);

      if (errMessage.includes('MISSING_SIGNATURE_FIELD')) {
        toast({
          title: _(msg`署名欄の配置に失敗しました`),
          description: _(msg`PDFの解析に失敗した可能性があります。詳細モードで配置してください。`),
          variant: 'destructive',
        });
      } else {
        toast({
          title: _(msg`送信に失敗しました`),
          description: _(msg`しばらく待ってからもう一度お試しください。`),
          variant: 'destructive',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-semibold text-2xl">
          <Trans>フィールドを確認して送信</Trans>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          <Trans>ステップ 3/3: 署名欄と日付を自動配置しました</Trans>
        </p>
      </div>

      <WizardProgress currentStep={3} />

      <div className="mt-8 rounded-lg border p-4" data-testid="wizard-summary">
        <h2 className="mb-2 font-medium">
          <Trans>送信内容の確認</Trans>
        </h2>
        <dl className="text-sm">
          <div className="flex justify-between py-1">
            <dt className="text-muted-foreground">
              <Trans>宛先</Trans>
            </dt>
            <dd data-testid="wizard-summary-name">
              {isLoadingEnvelope ? (
                <span className="text-muted-foreground">読み込み中...</span>
              ) : signer ? (
                <>
                  {signer.name} <span className="text-muted-foreground">({signer.email})</span>
                </>
              ) : (
                <span className="text-destructive">宛先が未設定です。ステップ2へ戻って入力してください。</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-muted-foreground">
              <Trans>文書名</Trans>
            </dt>
            <dd>{envelope?.title ?? '-'}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-muted-foreground">
              <Trans>自動配置フィールド</Trans>
            </dt>
            <dd>署名 / 日付</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-muted-foreground">
              <Trans>有効期限</Trans>
            </dt>
            <dd data-testid="wizard-summary-expiration">{expirationLabel}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-muted-foreground">
              <Trans>リマインダー</Trans>
            </dt>
            <dd data-testid="wizard-summary-reminder">
              {reminderEnabled ? `${reminderIntervalDays}日間隔・最大${reminderMaxCount}回` : 'オフ'}
            </dd>
          </div>
        </dl>
      </div>

      {/* フェーズ2 ステップ25・27: リマインダー・有効期限の送信画面設定 */}
      <div className="mt-6 rounded-lg border p-4" data-testid="wizard-notification-settings">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="wizard-expiration">
              <Trans>有効期限</Trans>
            </Label>
            <select
              id="wizard-expiration"
              data-testid="wizard-expiration"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={expirationDays}
              onChange={(e) => setExpirationDays(e.target.value)}
            >
              <option value="7">7日</option>
              <option value="14">14日</option>
              <option value="30">30日</option>
              <option value="none">無期限</option>
            </select>
          </div>

          <div>
            <Label htmlFor="wizard-reminder-interval">
              <Trans>リマインダー間隔</Trans>
            </Label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="wizard-reminder-enabled"
                data-testid="wizard-reminder-enabled"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
              />
              <select
                id="wizard-reminder-interval"
                data-testid="wizard-reminder-interval"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reminderIntervalDays}
                disabled={!reminderEnabled}
                onChange={(e) => setReminderIntervalDays(e.target.value)}
              >
                <option value="1">1日間隔</option>
                <option value="3">3日間隔</option>
                <option value="7">7日間隔</option>
              </select>
              <select
                data-testid="wizard-reminder-max"
                className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reminderMaxCount}
                disabled={!reminderEnabled}
                onChange={(e) => setReminderMaxCount(e.target.value)}
              >
                <option value="1">1回</option>
                <option value="3">3回</option>
                <option value="5">5回</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-muted-foreground text-sm">
        <Trans>自由に配置したい場合は「詳細モードで編集」から既存エディタをご利用ください。</Trans>
      </p>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" asChild>
          <Link to={`/t/${team.url}/new/recipients?envelopeId=${envelopeId}`}>
            <Trans>戻る</Trans>
          </Link>
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" asChild data-testid="wizard-advanced-mode">
            <Link to={`/t/${team.url}/documents`}>
              <Trans>詳細モードで編集</Trans>
            </Link>
          </Button>

          <Button
            data-testid="wizard-send"
            loading={isSending}
            disabled={isSending || isLoadingEnvelope || !signer}
            onClick={() => void onSend()}
          >
            <Trans>送信</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}
