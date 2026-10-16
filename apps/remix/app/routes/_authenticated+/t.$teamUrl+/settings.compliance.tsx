import {
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
import { CheckCircle2Icon, CopyIcon, DownloadIcon, FileTextIcon, ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';

import { SettingsHeader } from '~/components/general/settings-header';
import { useCurrentTeam } from '~/providers/team';
import { appMetaTags } from '~/utils/meta';

export function meta() {
  return appMetaTags(msg`Electronic Ledger Compliance`);
}

export default function TeamSettingsCompliancePage() {
  const team = useCurrentTeam();
  const { t } = useLingui();
  const { toast } = useToast();

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

  const handleDownload = (format: 'markdown' | 'txt') => {
    const filename = `電子取引データ事務処理規程_${companyName || '当社'}.${format === 'markdown' ? 'md' : 'txt'}`;
    const blob = new Blob([generatedRegulationText], { type: 'text/plain;charset=utf-8' });
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
      description: t`事務処理規程ファイルをダウンロードしました。印刷して社内に保管してください。`,
    });
  };

  const handleCopy = async () => {
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
      <SettingsHeader
        title={t`電子帳簿保存法・事務処理規程`}
        subtitle={t`タイムスタンプなしで電帳法を適法にクリアするための「事務処理規程」の備付およびコンプライアンス管理。`}
      />

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
          <div className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5 text-primary" />
            <CardTitle>
              <Trans>事務処理規程の作成・ダウンロード</Trans>
            </CardTitle>
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
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={() => handleDownload('markdown')}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              <Trans>規程をダウンロード (.md)</Trans>
            </Button>
            <Button variant="outline" onClick={() => handleDownload('txt')}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              <Trans>テキストで保存 (.txt)</Trans>
            </Button>
            <Button variant="ghost" onClick={handleCopy}>
              <CopyIcon className="mr-2 h-4 w-4" />
              <Trans>全文をコピー</Trans>
            </Button>
          </div>

          {/* プレビュー表示 */}
          <div className="mt-4">
            <Label className="text-muted-foreground text-xs">
              <Trans>規程プレビュー（クリックで全選択可能）</Trans>
            </Label>
            <pre className="mt-1 max-h-48 select-all overflow-y-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
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
              <Trans>国税庁 要件充足チェックリスト</Trans>
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
                  <Badge variant="outline" className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400">
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
    </div>
  );
}
