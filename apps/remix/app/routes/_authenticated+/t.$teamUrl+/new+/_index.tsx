import { useLimits } from '@documenso/ee/server-only/limits/provider/client';
import { formatDocumentsPath } from '@documenso/lib/utils/teams';
import { trpc } from '@documenso/trpc/react';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@documenso/ui/primitives/card';
import { DocumentDropzone } from '@documenso/ui/primitives/document-dropzone';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { EnvelopeType } from '@prisma/client';
import {
  BriefcaseIcon,
  DollarSignIcon,
  FileSignatureIcon,
  FileTextIcon,
  PlusIcon,
  RefreshCwIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UploadCloudIcon,
  UsersIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { PlanLimitUpgradeDialog } from '~/components/dialogs/plan-limit-upgrade-dialog';
import { TemplateUseDialog } from '~/components/dialogs/template-use-dialog';
import { useCurrentTeam } from '~/providers/team';

import type { Route } from './+types/_index';

export default function WizardStepUploadPage({ params }: Route.ComponentProps) {
  const { _ } = useLingui();
  const { toast } = useToast();
  const navigate = useNavigate();
  const team = useCurrentTeam();
  const { quota, remaining, refreshLimits } = useLimits();

  const [isUploading, setIsUploading] = useState(false);

  const templatesQuery = trpc.template.findTemplatesInternal.useQuery({
    perPage: 50,
  });

  const { mutateAsync: seedTemplates, isPending: isSeeding } = trpc.template.seedJapaneseTemplates.useMutation();
  const { mutateAsync: createEnvelope } = trpc.envelope.create.useMutation();

  const templates = templatesQuery.data?.data ?? [];

  const handleSeedTemplates = async () => {
    try {
      await seedTemplates();
      await templatesQuery.refetch();
      toast({
        title: _(msg`標準雛形を追加しました`),
        description: _(msg`売買・業務委託・秘密保持(NDA)の3大雛形が追加されました。`),
      });
    } catch (err) {
      toast({
        title: _(msg`追加に失敗しました`),
        description: _(msg`雛形の作成中にエラーが発生しました。`),
        variant: 'destructive',
      });
    }
  };

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

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

      navigate(`/t/${team.url}/new/recipients?envelopeId=${id}`);
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

  const getTemplateIcon = (title: string) => {
    if (title.includes('売買')) {
      return <DollarSignIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    }
    if (title.includes('業務委託')) {
      return <BriefcaseIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
    if (title.includes('秘密保持') || title.includes('NDA')) {
      return <ShieldCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (title.includes('雇用')) {
      return <UsersIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
    }
    return <FileTextIcon className="h-5 w-5 text-muted-foreground" />;
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
            <Trans>標準雛形から変数を入力して契約書を作成・送信するか、手元のPDFをアップロードして作成します</Trans>
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

      {/* Method A: Standard Japanese Templates */}
      <section className="mt-10">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SparklesIcon className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-foreground text-lg">
              <Trans>定型雛形から作成 (おすすめ)</Trans>
            </h2>
            <Badge variant="secondary" size="small">
              <Trans>差し込み変数対応</Trans>
            </Badge>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeedTemplates}
            loading={isSeeding}
            className="text-xs"
          >
            <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
            <Trans>標準雛形(3種)を再読込</Trans>
          </Button>
        </div>

        <p className="mb-6 text-muted-foreground text-sm">
          <Trans>
            売買・業務委託・秘密保持(NDA)の主要3雛形。取引先名や金額などの必要項目を入力して契約書を作成・送信できます。
          </Trans>
        </p>

        {templates.length === 0 ? (
          <Card className="border-dashed bg-muted/20 py-12 text-center">
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4 text-primary">
                <FileSignatureIcon className="h-8 w-8" />
              </div>
              <div className="max-w-md">
                <h3 className="font-semibold text-foreground">
                  <Trans>標準雛形がまだ登録されていません</Trans>
                </h3>
                <p className="mt-1 text-muted-foreground text-xs">
                  <Trans>
                    ワンクリックで売買契約書・業務委託契約書・秘密保持契約書(NDA)の3大雛形をチームに追加できます。
                  </Trans>
                </p>
              </div>
              <Button onClick={handleSeedTemplates} loading={isSeeding}>
                <PlusIcon className="mr-2 h-4 w-4" />
                <Trans>標準雛形（3種）をチームに追加</Trans>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {templates.map((tpl) => {
              const automation = tpl.automationSettings as {
                mergeVariables?: Array<{ name: string; required?: boolean }>;
                signingOrderLock?: { locked?: boolean; order?: string };
                requireEmailOtp?: boolean;
              } | null;

              const variables = automation?.mergeVariables ?? [];
              const isLocked = automation?.signingOrderLock?.locked;
              const lockOrder = automation?.signingOrderLock?.order;

              return (
                <Card
                  key={tpl.id}
                  className="flex flex-col justify-between border-border/80 transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
                        {getTemplateIcon(tpl.title)}
                      </div>
                      <Badge variant="neutral" size="small">
                        {isLocked ? (
                          lockOrder === 'counterparty-first' ? (
                            <Trans>先方→自社</Trans>
                          ) : (
                            <Trans>自社→先方</Trans>
                          )
                        ) : (
                          <Trans>順序自由</Trans>
                        )}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3 line-clamp-1 font-semibold text-base">{tpl.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {tpl.publicDescription || _(msg`定型契約書の標準雛形`)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2">
                      <div className="font-medium text-[11px] text-muted-foreground">
                        <Trans>差し込み変数:</Trans>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {variables.length > 0 ? (
                          variables.map((v) => (
                            <span
                              key={v.name}
                              className="inline-flex items-center rounded-md border border-border/50 bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                            >
                              {`{{${v.name}}}`}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            <Trans>変数なし (定型)</Trans>
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <TemplateUseDialog
                      envelopeId={tpl.envelopeId}
                      templateId={tpl.id}
                      templateSigningOrder={tpl.templateMeta?.signingOrder}
                      recipients={tpl.recipients}
                      documentDistributionMethod={tpl.templateMeta?.distributionMethod}
                      documentRootPath={formatDocumentsPath(team.url)}
                      automationSettings={tpl.automationSettings as any}
                      trigger={
                        <Button className="w-full font-medium" data-testid={`use-template-${tpl.id}`}>
                          <SparklesIcon className="mr-2 h-4 w-4" />
                          <Trans>この雛形を使う</Trans>
                        </Button>
                      }
                    />
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="relative my-10">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-border/60 border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">
            <Trans>または手元のファイルから作成</Trans>
          </span>
        </div>
      </div>

      {/* Method B: Custom PDF Upload */}
      <section>
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
    { id: 1, label: _(msg`契約書選択・アップロード`) },
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
