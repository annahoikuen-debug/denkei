import type { TMergeVariable } from '@documenso/lib/types/merge-variables';
import type { TTemplateAutomationSettings } from '@documenso/lib/types/template-automation';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Checkbox } from '@documenso/ui/primitives/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@documenso/ui/primitives/dialog';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { FileSpreadsheet, Loader2, Wand2 } from 'lucide-react';
import { useState } from 'react';

/**
 * フェーズ3 ステップ6: PDFフォーム(AcroForm)自動検出ダイアログ
 *
 * 既存 PDF に含まれるフォーム項目を検知し、ワンクリックでテンプレート変数として一括登録する。
 */

export type TemplateAcroFormDetectDialogProps = {
  templateId: number;
  automationSettings: TTemplateAutomationSettings | null;
  trigger?: React.ReactNode;
};

export const TemplateAcroFormDetectDialog = ({
  templateId,
  automationSettings,
  trigger,
}: TemplateAcroFormDetectDialogProps) => {
  const { _ } = useLingui();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedFieldNames, setSelectedFieldNames] = useState<Record<string, boolean>>({});

  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.template.detectAcroFormFields.useQuery(
    { templateId },
    {
      enabled: open,
    },
  );

  const { mutateAsync: updateAutomationSettings, isPending: isUpdating } =
    trpc.template.updateAutomationSettings.useMutation({
      onSuccess: async () => {
        toast({
          title: _(msg`変数を自動追加しました`),
          description: _(msg`検知されたフォーム項目を差し込み変数として保存しました。`),
        });
        await utils.template.getTemplateById.invalidate({ templateId });
        setOpen(false);
      },
      onError: () => {
        toast({
          title: _(msg`追加に失敗しました`),
          description: _(msg`エラーが発生しました。設定を確認してください。`),
          variant: 'destructive',
        });
      },
    });

  const detectedFields = data?.fields ?? [];

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      refetch();
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    for (const f of detectedFields) {
      updated[f.name] = checked;
    }
    setSelectedFieldNames(updated);
  };

  const handleApply = async () => {
    const chosen = detectedFields.filter(
      (f) => selectedFieldNames[f.name] !== false, // デフォルトで全選択扱い
    );

    if (chosen.length === 0) {
      toast({
        title: _(msg`追加する項目がありません`),
        description: _(msg`1つ以上の項目を選択してください。`),
      });
      return;
    }

    const currentVariables: TMergeVariable[] = [...((automationSettings?.mergeVariables ?? []) as TMergeVariable[])];

    const currentNames = new Set(currentVariables.map((v) => v.name));

    for (const f of chosen) {
      if (!currentNames.has(f.suggestedVariable.name)) {
        currentVariables.push(f.suggestedVariable as TMergeVariable);
        currentNames.add(f.suggestedVariable.name);
      }
    }

    await updateAutomationSettings({
      templateId,
      automationSettings: {
        ...(automationSettings ?? {
          signingOrderLock: { locked: false },
          approval: { enabled: false, rejectToDraft: true },
        }),
        mergeVariables: currentVariables,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-x-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            <Trans>PDF項目を自動検出</Trans>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent position="center" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-x-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <Trans>PDFフォーム(AcroForm)項目の自動検出</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              PDF内にあらかじめ設定されているフォームフィールド（入力枠やチェックボックス）を自動検出し、差し込み変数として一括登録します。
            </Trans>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-y-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">
                <Trans>PDFのフォーム構造を解析中...</Trans>
              </p>
            </div>
          ) : detectedFields.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
              <p className="text-sm">
                <Trans>PDF内にフォーム入力項目（AcroForm）は見つかりませんでした。</Trans>
              </p>
              <p className="mt-1 text-xs">
                <Trans>手動で「変数を管理」から変数を追加するか、フィールドを直接配置してください。</Trans>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-x-2">
                  <Checkbox
                    id="select-all"
                    defaultChecked={true}
                    onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                  />
                  <label htmlFor="select-all" className="cursor-pointer font-medium text-xs">
                    <Trans>すべて選択 ({detectedFields.length}件)</Trans>
                  </label>
                </div>
                <span className="text-muted-foreground text-xs">
                  <Trans>推定された型</Trans>
                </span>
              </div>

              <div className="max-h-60 space-y-2 overflow-y-auto">
                {detectedFields.map((field) => {
                  const isChecked = selectedFieldNames[field.name] ?? true;
                  return (
                    <div
                      key={field.name}
                      className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-x-2.5">
                        <Checkbox
                          id={`field-${field.name}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            setSelectedFieldNames((prev) => ({
                              ...prev,
                              [field.name]: Boolean(checked),
                            }))
                          }
                        />
                        <div>
                          <label htmlFor={`field-${field.name}`} className="cursor-pointer font-medium">
                            {field.name}
                          </label>
                          <p className="text-muted-foreground text-xs">
                            P.{field.page} (x: {Math.round(field.x)}, y: {Math.round(field.y)})
                          </p>
                        </div>
                      </div>

                      <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                        {field.suggestedVariable.type === 'currency'
                          ? _(msg`金額(円)`)
                          : field.suggestedVariable.type === 'date'
                            ? _(msg`日付`)
                            : field.suggestedVariable.type === 'wareki'
                              ? _(msg`和暦`)
                              : field.suggestedVariable.type === 'number'
                                ? _(msg`数値`)
                                : _(msg`テキスト`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            <Trans>閉じる</Trans>
          </Button>

          {detectedFields.length > 0 && (
            <Button type="button" loading={isUpdating} onClick={handleApply}>
              <Trans>選択した項目を変数に追加</Trans>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
