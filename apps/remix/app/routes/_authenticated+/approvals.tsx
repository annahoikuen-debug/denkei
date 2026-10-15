import { trpc } from '@documenso/trpc/react';
import type { TPendingApprovalItem } from '@documenso/trpc/server/approval-router/schema';
import { DenkeiCallout } from '@documenso/ui';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { CheckCircle2, Clock, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ApprovalActionDialog } from '~/components/dialogs/approval-action-dialog';
import { appMetaTags } from '~/utils/meta';

export function meta() {
  return appMetaTags(msg`承認待ち一覧`);
}

export default function ApprovalsPage() {
  const [page, _setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<TPendingApprovalItem | null>(null);
  const [actionDialogMode, setActionDialogMode] = useState<'approve' | 'reject'>('approve');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading } = trpc.approval.findPendingApprovals.useQuery({
    page,
    perPage: 10,
  });

  const handleOpenAction = (item: TPendingApprovalItem, mode: 'approve' | 'reject') => {
    setSelectedItem(item);
    setActionDialogMode(mode);
    setIsDialogOpen(true);
  };

  const pendingList = data?.data ?? [];
  const totalCount = data?.count ?? 0;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 md:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <Trans>承認待ち一覧 (Approval Dashboard)</Trans>
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            <Trans>あなたが社内承認者（APPROVER）に指名されている未承認の契約書一覧です。</Trans>
          </p>
        </div>
        <Badge variant="secondary" className="self-start px-3 py-1 text-sm md:self-auto">
          承認待ち: {totalCount} 件
        </Badge>
      </div>

      <div className="mb-6">
        <DenkeiCallout
          variant="guide"
          title="デンケイの承認フロー案内"
          message="内容を確認のうえ「承認」すると、後続の署名者へ回覧が自動開始されます。修正が必要な場合は「差し戻し」を行うことで、理由を添えて作成者の下書きに戻すことができます。"
        />
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Clock className="mr-2 h-5 w-5 animate-spin" />
            <Trans>読み込み中...</Trans>
          </div>
        ) : pendingList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <h3 className="font-medium text-lg">現在、承認待ちの文書はありません</h3>
            <p className="mt-1 max-w-sm text-muted-foreground text-sm">
              回覧された契約書がある場合、ここに一覧表示されワンクリックで確認・承認を行えます。
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {pendingList.map((item) => (
              <div
                key={item.envelopeId}
                className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-muted/40 sm:p-5 md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-base">{item.title}</span>
                    <Badge
                      variant="neutral"
                      className="shrink-0 border-amber-200 bg-amber-50 text-amber-700 text-xs dark:bg-amber-950/40"
                    >
                      承認待ち
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
                    <span>
                      作成者: <strong className="font-medium text-foreground">{item.senderName}</strong> (
                      {item.senderEmail})
                    </span>
                    <span>回覧日: {new Date(item.createdAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleOpenAction(item, 'reject')}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    <Trans>差し戻し</Trans>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => handleOpenAction(item, 'approve')}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    <Trans>承認する</Trans>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <ApprovalActionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          mode={actionDialogMode}
          envelopeId={selectedItem.envelopeId}
          recipientId={selectedItem.recipientId}
          documentTitle={selectedItem.title}
          senderName={selectedItem.senderName}
        />
      )}
    </div>
  );
}
