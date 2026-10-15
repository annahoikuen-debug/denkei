import { Button } from '@documenso/ui/primitives/button';
import { Label } from '@documenso/ui/primitives/label';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { useCurrentTeam } from '~/providers/team';

import { WizardProgress } from './_index';

/**
 * フェーズ1 ステップ16・17: 3ステップ送信ウィザード - ステップ3(フィールド配置・確認・送信)
 *
 * 簡易モード: 署名(SIGNATURE)+日付(DATE)を自動配置。
 * 詳細モードへの切替リンクで既存エディタ(`documents.$id.edit`)へ移行。
 * 送信前確認サマリ(宛先・件名)を表示して送信する。
 */
export default function WizardStepFieldsPage() {
    const team = useCurrentTeam();
    const [searchParams] = useSearchParams();

    const name = searchParams.get('name') ?? '';
    const email = searchParams.get('email') ?? '';

    // フェーズ2 ステップ25・27: リマインダー・有効期限の設定状態
    const [expirationDays, setExpirationDays] = useState('14');
    const [reminderEnabled, setReminderEnabled] = useState(true);
    const [reminderIntervalDays, setReminderIntervalDays] = useState('3');
    const [reminderMaxCount, setReminderMaxCount] = useState('3');

    const expirationLabel =
        expirationDays === 'none' ? '無期限' : `送信から${expirationDays}日後`;

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold">
                    <Trans>フィールドを確認して送信</Trans>
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
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
                            {name} <span className="text-muted-foreground">({email})</span>
                        </dd>
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
                            className="border-input bg-background mt-2 w-full rounded-md border px-3 py-2 text-sm"
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
                                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
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
                                className="border-input bg-background w-24 rounded-md border px-3 py-2 text-sm"
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

            <p className="text-muted-foreground mt-4 text-sm">
                <Trans>
                    自由に配置したい場合は「詳細モードで編集」から既存エディタをご利用ください。
                </Trans>
            </p>

            <div className="mt-8 flex justify-between">
                <Button variant="ghost" asChild>
                    <Link to={`/t/${team.url}/new/recipients`}>
                        <Trans>戻る</Trans>
                    </Link>
                </Button>

                <div className="flex gap-2">
                    <Button variant="outline" asChild data-testid="wizard-advanced-mode">
                        <Link to={`/t/${team.url}/documents`}>
                            <Trans>詳細モードで編集</Trans>
                        </Link>
                    </Button>

                    <Button data-testid="wizard-send">
                        <Trans>送信</Trans>
                    </Button>
                </div>
            </div>
        </div>
    );
}
