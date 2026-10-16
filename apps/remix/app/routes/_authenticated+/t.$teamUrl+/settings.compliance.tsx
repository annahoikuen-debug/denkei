import { useCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { isFeatureEnabledForPlan, PLANS, resolvePlanIdFromOrganisation } from '@documenso/lib/constants/plans';
import {
  buildCompleteComplianceKitText,
  buildCompliancePrintHtml,
  buildElectronicLedgerRegulationDocument,
  NTA_COMPLIANCE_CHECKLIST,
} from '@documenso/lib/universal/compliance-kit';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@documenso/ui/primitives/card';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  LockIcon,
  PrinterIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { PlanLimitUpgradeDialog } from '~/components/dialogs/plan-limit-upgrade-dialog';
import { SettingsHeader } from '~/components/general/settings-header';
import { useCurrentTeam } from '~/providers/team';
import { appMetaTags } from '~/utils/meta';

export function meta() {
  return appMetaTags(msg`Electronic Ledger Compliance`);
}

export default function TeamSettingsCompliancePage() {
  const team = useCurrentTeam();
  const organisation = useCurrentOrganisation();
  const { t } = useLingui();
  const { toast } = useToast();

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // プラン判定
  const planId = resolvePlanIdFromOrganisation(organisation);
  const currentPlan = PLANS[planId];
  const hasComplianceAccess = isFeatureEnabledForPlan({ plan: planId, feature: 'complianceKit' });

  const todayStr = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const [companyName, setCompanyName] = useState(team.name || '');
  const [representativeName, setRepresentativeName] = useState('');
  const [enactedDate, setEnactedDate] = useState(todayStr);
  const [adminManagerTitle, setAdminManagerTitle] = useState('代表取締役');

  const generatedRegulationText = buildElectronicLedgerRegulationDocument({
    companyName: companyName || team.name,
    representativeName: representativeName || undefined,
    enactedDate,
    adminManagerTitle,
  });

  const handlePrintA4 = () => {
    if (!hasComplianceAccess) {
      setUpgradeDialogOpen(true);
      return;
    }

    const htmlContent = buildCompliancePrintHtml({
      companyName: companyName || team.name,
      representativeName: representativeName || undefined,
      enactedDate,
      adminManagerTitle,
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
    } else {
      toast({
        title: t`ポップアップがブロックされました`,
        description: t`ブラウザのポップアップブロックを解除してもう一度お試しください。`,
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (format: 'markdown' | 'txt' | 'complete-kit') => {
    if (!hasComplianceAccess) {
      setUpgradeDialogOpen(true);
      return;
    }

    const content =
      format === 'complete-kit'
        ? buildCompleteComplianceKitText({
            companyName: companyName || team.name,
            representativeName: representativeName || undefined,
            enactedDate,
            adminManagerTitle,
          })
        : generatedRegulationText;

    const extension = format === 'complete-kit' || format === 'markdown' ? 'md' : 'txt';
    const prefix = format === 'complete-kit' ? '電帳法コンプライアンス完全パック' : '電子取引データ事務処理規程';
    const filename = `${prefix}_${companyName || '当社'}.${extension}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: t`ダウンロード完了`,
      description: t`${filename} をダウンロードしました。印刷して社内に保管してください。`,
    });
  };

  const handleCopy = async () => {
    if (!hasComplianceAccess) {
      setUpgradeDialogOpen(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedRegulationText);
      toast({
        title: t`コピーしました`,
        description: t`事務処理規程の全文をクリップボードにコピーしました。`,
      });
    } catch {
      toast({
        title: t`コピーに失敗しました`,
        description: t`手動でテキストを選択してコピーしてください。`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SettingsHeader
          title={t`電子帳簿保存法・事務処理規程`}
          subtitle={t`タイムスタンプなしで電帳法を適法にクリアするための「事務処理規程」の備付およびコンプライアンス管理。`}
        />
        <div>
          {hasComplianceAccess ? (
            <Badge
              variant="outline"
              className="border-emerald-600/40 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-700 dark:text-emerald-400"
            >
              <ShieldCheckIcon className="mr-1.5 h-4 w-4 text-emerald-600" />
              <span>{currentPlan.label} 特典利用中</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-amber-600/40 bg-amber-500/10 px-3 py-1 font-bold text-amber-700 dark:text-amber-400"
            >
              <LockIcon className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
              <Trans>無料プラン（出力機能ロック中）</Trans>
            </Badge>
          )}
        </div>
      </div>

      {/* 無料プラン向け アップセル誘導カード */}
      {!hasComplianceAccess && (
        <Card
          className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 shadow-md"
          data-testid="compliance-kit-upsell-card"
        >
          <CardContent className="pt-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="font-bold">
                    <LockIcon className="mr-1 h-3.5 w-3.5" />
                    <Trans>有料プラン限定機能</Trans>
                  </Badge>
                  <span className="font-semibold text-muted-foreground text-xs">
                    <Trans>中小応援スタンダード以上で利用可能</Trans>
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-lg">
                  <Trans>電帳法コンプライアンス・ワンクリック出力パック</Trans>
                </h3>
                <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
                  <Trans>
                    国税庁準拠の「事務処理規程」の社内備付用A4印刷・PDF出力および、要件チェックリスト完全パックのダウンロードは、
                    <strong>中小応援スタンダードプラン（月額2,980円）</strong>以上でご利用いただけます。
                  </Trans>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                    <Trans>社内備付用 A4印刷・PDF出力</Trans>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                    <Trans>国税庁チェックリスト同梱</Trans>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                    <Trans>税務調査にそのまま提示可能</Trans>
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 font-bold text-white shadow-md shadow-red-600/20 hover:from-red-700 hover:to-red-800 sm:w-auto"
                >
                  <Link to={`/t/${team.url}/settings/billing`}>
                    <span>
                      <Trans>スタンダードへアップグレード</Trans>
                    </span>
                    <ArrowRightIcon className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 合法化の解説バナー */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-base text-emerald-950 dark:text-emerald-300">
                <Trans>なぜタイムスタンプがなくても100%適法なのか？</Trans>
              </h3>
              <p className="mt-1 text-emerald-900/80 text-sm leading-relaxed dark:text-emerald-400">
                <Trans>
                  国税庁の電子帳簿保存法（電子取引データ保存）規則では、認定タイムスタンプの代わりに
                  <strong>「訂正・削除の防止に関する事務処理規程を備え付けること」</strong>
                  （施行規則第3条・第4条）で合法的に要件を満たせると明確に定められています。
                  下記の規程を1部印刷して社内に備え付けておくだけで、税務調査に完全対応できます。
                </Trans>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 規程カスタマイズ・ダウンロード */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5 text-primary" />
              <CardTitle>
                <Trans>事務処理規程の作成・ワンクリック出力パック</Trans>
              </CardTitle>
            </div>
            {!hasComplianceAccess && (
              <Badge variant="secondary" className="font-semibold text-xs">
                <LockIcon className="mr-1 h-3 w-3 text-muted-foreground" />
                <Trans>出力機能制限中</Trans>
              </Badge>
            )}
          </div>
          <CardDescription>
            <Trans>自社情報を入力すると、国税庁サンプルに完全準拠した規程文面が即座に生成されます。</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">
                <Trans>会社名・屋号</Trans>
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="〇〇株式会社"
                disabled={!hasComplianceAccess}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repName">
                <Trans>代表者名</Trans>
              </Label>
              <Input
                id="repName"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="代表取締役 山田 太郎"
                disabled={!hasComplianceAccess}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="enactedDate">
                <Trans>制定日・施行日</Trans>
              </Label>
              <Input
                id="enactedDate"
                value={enactedDate}
                onChange={(e) => setEnactedDate(e.target.value)}
                placeholder="2026年10月16日"
                disabled={!hasComplianceAccess}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerTitle">
                <Trans>管理責任者の役職</Trans>
              </Label>
              <Input
                id="managerTitle"
                value={adminManagerTitle}
                onChange={(e) => setAdminManagerTitle(e.target.value)}
                placeholder="代表取締役 または 管理部長"
                disabled={!hasComplianceAccess}
              />
            </div>
          </div>

          {/* 出力ボタングループ */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              onClick={handlePrintA4}
              className="bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700"
              data-testid="compliance-print-btn"
            >
              {hasComplianceAccess ? <PrinterIcon className="mr-2 h-4 w-4" /> : <LockIcon className="mr-2 h-4 w-4" />}
              <Trans>社内備付用 A4印刷 / PDF保存</Trans>
            </Button>

            <Button
              onClick={() => handleDownload('complete-kit')}
              variant="default"
              data-testid="compliance-complete-kit-btn"
            >
              {hasComplianceAccess ? (
                <SparklesIcon className="mr-2 h-4 w-4 text-amber-400" />
              ) : (
                <LockIcon className="mr-2 h-4 w-4" />
              )}
              <Trans>完全パック一括保存 (.md)</Trans>
            </Button>

            <Button variant="outline" onClick={() => handleDownload('txt')} data-testid="compliance-download-txt-btn">
              {hasComplianceAccess ? <DownloadIcon className="mr-2 h-4 w-4" /> : <LockIcon className="mr-2 h-4 w-4" />}
              <Trans>テキストで保存 (.txt)</Trans>
            </Button>

            <Button variant="ghost" onClick={handleCopy} data-testid="compliance-copy-btn">
              <CopyIcon className="mr-2 h-4 w-4" />
              <Trans>全文をコピー</Trans>
            </Button>
          </div>

          {/* プレビュー表示 */}
          <div className="relative mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">
                <Trans>規程プレビュー（クリックで全選択可能）</Trans>
              </Label>
              {!hasComplianceAccess && (
                <span className="flex items-center gap-1 font-medium text-[11px] text-amber-600 dark:text-amber-400">
                  <LockIcon className="h-3 w-3" />
                  <Trans>有料プランで完全出力・印刷が解除されます</Trans>
                </span>
              )}
            </div>

            <pre
              className={`mt-1 max-h-48 select-all overflow-y-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed ${!hasComplianceAccess ? 'opacity-80' : ''}`}
            >
              {generatedRegulationText}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* 要件充足チェックリスト */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="h-5 w-5 text-emerald-600" />
            <CardTitle>
              <Trans>国税庁 要件充足チェックリスト（電帳法対応）</Trans>
            </CardTitle>
          </div>
          <CardDescription>
            <Trans>デンケイのシステム仕様および上記規程によって充足されている法的要件の一覧です。</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {NTA_COMPLIANCE_CHECKLIST.map((item) => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-sm">{item.title}</span>
                  </div>
                  <Badge variant="default" className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400">
                    <Trans>充足</Trans>
                  </Badge>
                </div>
                <p className="mt-1 pl-6 text-muted-foreground text-xs leading-relaxed">{item.description}</p>
                <div className="mt-1 pl-6 text-[11px] text-muted-foreground/80">
                  <span className="font-semibold">根拠条文:</span> {item.ntaRegulationArticle} |{' '}
                  <span className="font-semibold">デンケイの担保:</span> {item.denkeiImplementation}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* アップグレード誘導ダイアログ */}
      <PlanLimitUpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        teamUrl={team.url}
        limitCount={3}
        currentPlanLabel={currentPlan.label}
      />
    </div>
  );
}
