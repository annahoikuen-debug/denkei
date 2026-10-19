import { useLimits } from '@documenso/ee/server-only/limits/provider/client';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { DocumentDropzone } from '@documenso/ui/primitives/document-dropzone';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { EnvelopeType } from '@prisma/client';
import { ScaleIcon, UploadCloudIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { PlanLimitUpgradeDialog } from '~/components/dialogs/plan-limit-upgrade-dialog';
import { useCurrentTeam } from '~/providers/team';

export default function WizardStepUploadPage() {
  const { _ } = useLingui();
  const { toast } = useToast();
  const navigate = useNavigate();
  const team = useCurrentTeam();
  const { quota, remaining, refreshLimits } = useLimits();

  const [isUploading, setIsUploading] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const { mutateAsync: createEnvelope } = trpc.envelope.create.useMutation();

  const onDropPdf = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    try {
      setIsUploading(true);

      const payload = {
        type: EnvelopeType.DOCUMENT,
        title: files[0].name.replace(/\.[^/.]+$/, ''),
      };

      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      for (const file of files) {
        formData.append('files', file);
      }

      const { id } = await createEnvelope(formData);
      void refreshLimits();

      toast({
        title: _(msg`PDFをアップロードしました`),
        description: _(msg`宛先の入力画面へ進みます。`),
      });

      void navigate(`/t/${team.url}/new/recipients?envelopeId=${id}`);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      if (errMessage.includes('LIMIT_EXCEEDED') || errMessage.includes('上限') || errMessage.includes('limit')) {
        setUpgradeDialogOpen(true);
        return;
      }

      toast({
        title: _(msg`アップロードに失敗しました`),
        description: _(msg`PDFファイルの読み込みに失敗しました。もう一度お試しください。`),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
            <Trans>新しい契約書を作成・送信</Trans>
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            <Trans>手元の契約書PDFをアップロードして作成し、署名者と署名欄を設定して送信します</Trans>
          </p>
        </div>

        {/* Quota Badge for SMB Plan */}
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2 text-xs">
          <span className="font-semibold text-foreground">Standard</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">
            <Trans>月間残枠:</Trans> <strong className="text-foreground">{remaining.documents}</strong> /{' '}
            {quota.documents} <Trans>件</Trans>
          </span>
        </div>
      </div>

      <WizardProgress currentStep={1} />

      {/* PDF Upload */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
            <UploadCloudIcon className="h-4 w-4" />
          </div>
          <h2 className="font-semibold text-foreground text-lg">
            <Trans>手元のPDFをアップロードして作成</Trans>
          </h2>
        </div>
        <p className="mb-4 text-muted-foreground text-sm">
          <Trans>お手持ちの契約書PDFを直接アップロードし、署名者と署名欄を自由に配置して送信します。</Trans>
        </p>

        <DocumentDropzone onDrop={onDropPdf} disabled={isUploading} className="border-dashed py-10" />

        <div className="mt-4 text-center">
          <Link to={`/t/${team.url}/templates`}>
            <Button type="button" variant="outline" size="sm" className="text-xs">
              <Trans>保存済みテンプレートから作成する場合はこちら</Trans>
            </Button>
          </Link>
        </div>
      </section>

      {/* Bottom Compliance & Navigation Links */}
      <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 text-muted-foreground text-xs sm:flex-row">
        <div className="flex items-center gap-2">
          <ScaleIcon className="h-4 w-4 text-primary" />
          <span>
            <Trans>電子帳簿保存法対応: 事務処理規程および検索要件CSVダウンロードは設定画面より利用可能です。</Trans>
          </span>
        </div>
        <Link to={`/t/${team.url}/settings/compliance`} className="font-medium text-primary hover:underline">
          <Trans>事務処理規程・電帳法設定へ →</Trans>
        </Link>
      </div>

      <PlanLimitUpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        teamUrl={team.url}
        limitCount={quota.documents || 3}
      />
    </div>
  );
}

export function WizardProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const { _ } = useLingui();

  const steps = [
    { id: 1, label: _(msg`PDFアップロード`) },
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
              ? 'rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs'
              : step.id < currentStep
                ? 'rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground text-xs'
                : 'rounded-full px-3 py-1 text-xs opacity-50'
          }
          aria-current={step.id === currentStep ? 'step' : undefined}
        >
          {step.id}. {step.label}
        </li>
      ))}
    </ol>
  );
}
