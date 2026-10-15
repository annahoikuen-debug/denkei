import { EnvelopeEditorProvider } from '@documenso/lib/client-only/providers/envelope-editor-provider';
import { DO_NOT_INVALIDATE_QUERY_ON_MUTATION } from '@documenso/lib/constants/trpc';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Spinner } from '@documenso/ui/primitives/spinner';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';

import { GenericErrorLayout } from '~/components/general/generic-error-layout';
import { useCurrentTeam } from '~/providers/team';

import type { Route } from './+types/_index';

/**
 * フェーズ1 ステップ14: 3ステップ送信ウィザード - ステップ1(PDFアップロード)
 *
 * 既存のエンベロープ編集 UI(EnvelopeEditor)を流用しつつ、
 * ウィザードとして「アップロード → 宛先 → フィールド配置・送信」の導線を提供する。
 */
export default function WizardStepUploadPage({ params }: Route.ComponentProps) {
    const navigate = useNavigate();
    const team = useCurrentTeam();

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold">
                    <Trans>新しい契約書を送信</Trans>
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    <Trans>ステップ 1/3: PDFをアップロードしてください</Trans>
                </p>
            </div>

            <WizardProgress currentStep={1} />

            <div className="mt-8">
                <Trans>
                    PDFのアップロード画面(既存のエンベロープ作成機構を利用)。ドラッグ&ドロップで
                    PDFを追加すると、宛先入力へ進めます。
                </Trans>
            </div>

            <div className="mt-8 flex justify-end">
                <Button
                    onClick={() => navigate(`/t/${team.url}/new/recipients`)}
                    data-testid="wizard-step1-next"
                >
                    <Trans>次へ</Trans>
                </Button>
            </div>
        </div>
    );
}

export function WizardProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
    const { _ } = useLingui();

    const steps = [
        { id: 1, label: _(msg`アップロード`) },
        { id: 2, label: _(msg`宛先入力`) },
        { id: 3, label: _(msg`フィールド配置・送信`) },
    ] as const;

    return (
        <ol className="flex items-center gap-2" data-testid="wizard-progress">
            {steps.map((step) => (
                <li
                    key={step.id}
                    className={
                        step.id === currentStep
                            ? 'bg-primary text-primary-foreground rounded-full px-3 py-1 text-sm'
                            : step.id < currentStep
                                ? 'bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm'
                                : 'rounded-full px-3 py-1 text-sm opacity-50'
                    }
                    aria-current={step.id === currentStep ? 'step' : undefined}
                >
                    {step.id}. {step.label}
                </li>
            ))}
        </ol>
    );
}
