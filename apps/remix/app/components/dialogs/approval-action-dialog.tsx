import { trpc } from '@documenso/trpc/react';
import { DenkeiCallout } from '@documenso/ui';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trans } from '@lingui/react/macro';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const ZRejectFormSchema = z.object({
  reason: z.string().trim().min(1, '差し戻し理由は必須です').max(500, '500文字以内で入力してください'),
});

type TRejectFormSchema = z.infer<typeof ZRejectFormSchema>;

export type ApprovalActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'approve' | 'reject';
  envelopeId: string;
  recipientId: number;
  documentTitle: string;
  senderName: string;
  onSuccess?: () => void;
};

export const ApprovalActionDialog = ({
  open,
  onOpenChange,
  mode,
  envelopeId,
  recipientId,
  documentTitle,
  senderName,
  onSuccess,
}: ApprovalActionDialogProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const form = useForm<TRejectFormSchema>({
    resolver: zodResolver(ZRejectFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  const { mutateAsync: approveEnvelope, isPending: isApproving } = trpc.approval.approve.useMutation({
    onSuccess: async () => {
      toast({
        title: '承認完了',
        description: `「${documentTitle}」を承認しました。次の署名者へ回覧されます。`,
      });
      await utils.approval.findPendingApprovals.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast({
        title: '承認エラー',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const { mutateAsync: rejectEnvelope, isPending: isRejecting } = trpc.approval.reject.useMutation({
    onSuccess: async () => {
      toast({
        title: '差し戻し完了',
        description: `「${documentTitle}」を作成者（${senderName}）へ差し戻しました。下書き状態に戻ります。`,
      });
      await utils.approval.findPendingApprovals.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (err) => {
      toast({
        title: '差し戻しエラー',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const onConfirmApprove = async () => {
    await approveEnvelope({ envelopeId, recipientId });
  };

  const onConfirmReject = async (values: TRejectFormSchema) => {
    await rejectEnvelope({
      envelopeId,
      recipientId,
      reason: values.reason,
    });
  };

  const isSubmitting = isApproving || isRejecting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="center" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'approve' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>契約書の承認</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-5 w-5 text-amber-600" />
                <span>契約書の差し戻し（下書き復帰）</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            対象文書: <span className="font-medium text-foreground">{documentTitle}</span>（作成者: {senderName}）
          </DialogDescription>
        </DialogHeader>

        {mode === 'approve' ? (
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              この契約書の内容を確認し、社内承認を完了しますか？
              承認が完了すると、次のステップの署名者へ自動配信されます。
            </p>
            <DenkeiCallout
              variant="guide"
              title="デンケイの承認チェック"
              message="承認ログはタイムスタンプ付きの監査ログ（ハッシュチェーン）に安全に記録されます。"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                <Trans>キャンセル</Trans>
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={onConfirmApprove}
                loading={isApproving}
              >
                承認して送信を進める
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onConfirmReject)} className="space-y-4 py-2">
              <p className="text-muted-foreground text-sm leading-relaxed">
                作成者に修正を求める差し戻し理由を入力してください。ドキュメントは下書き（DRAFT）へ戻ります。
              </p>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>差し戻し理由</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="例: 第4条の支払期日を月末締翌月末払いに修正してください。"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  <Trans>キャンセル</Trans>
                </Button>
                <Button type="submit" variant="destructive" loading={isRejecting}>
                  差し戻す
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
