import type { TMergeVariableList } from '@documenso/lib/types/merge-variables';
import { ZMergeVariableSchema } from '@documenso/lib/types/merge-variables';
import type { TTemplateAutomationSettings } from '@documenso/lib/types/template-automation';
import { trpc } from '@documenso/trpc/react';
import type { TUpdateAutomationSettingsRequestSchema } from '@documenso/trpc/server/template-router/schema';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@documenso/ui/primitives/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { Switch } from '@documenso/ui/primitives/switch';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

/**
 * フェーズ3 ステップ1: テンプレート編集UIへの変数挿入ダイアログ。
 *
 * テンプレートに差し込み変数(`{{変数名}}`)の定義リストを管理し、
 * 署名順固定・承認設定と合わせて automationSettings として保存する。
 */

const ZFormSchema = z.object({
  variables: z
    .array(ZMergeVariableSchema)
    .max(100, '変数は100個までです')
    .refine(
      (variables) => {
        const names = variables.map((v) => v.name);

        return new Set(names).size === names.length;
      },
      { message: '変数名が重複しています' },
    ),
  signingOrderLocked: z.boolean().default(false),
  signingOrderType: z.enum(['counterparty-first', 'company-first']).default('counterparty-first'),
  requireEmailOtp: z.boolean().default(false),
});

type TFormSchema = z.infer<typeof ZFormSchema>;

export type TemplateMergeVariableDialogProps = {
  templateId: number;
  automationSettings: TTemplateAutomationSettings | null;
  trigger?: React.ReactNode;
};

export const TemplateMergeVariableDialog = ({
  templateId,
  automationSettings,
  trigger,
}: TemplateMergeVariableDialogProps) => {
  const { _ } = useLingui();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const utils = trpc.useUtils();

  const form = useForm<TFormSchema>({
    resolver: zodResolver(ZFormSchema),
    defaultValues: {
      variables: (automationSettings?.mergeVariables ?? []) as TMergeVariableList,
      signingOrderLocked: Boolean(automationSettings?.signingOrderLock?.locked),
      signingOrderType:
        automationSettings?.signingOrderLock?.order === 'company-first' ? 'company-first' : 'counterparty-first',
      requireEmailOtp: Boolean((automationSettings as any)?.requireEmailOtp),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variables',
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variables: (automationSettings?.mergeVariables ?? []) as TMergeVariableList,
        signingOrderLocked: Boolean(automationSettings?.signingOrderLock?.locked),
        signingOrderType:
          automationSettings?.signingOrderLock?.order === 'company-first' ? 'company-first' : 'counterparty-first',
        requireEmailOtp: Boolean((automationSettings as any)?.requireEmailOtp),
      });
    }
  }, [open, automationSettings, form]);

  const { mutateAsync: updateAutomationSettings, isPending } = trpc.template.updateAutomationSettings.useMutation({
    onSuccess: async () => {
      toast({
        title: _(msg`設定を保存しました`),
        description: _(msg`テンプレートの自動化設定を更新しました。`),
      });

      await utils.template.getTemplateById.invalidate({ templateId });

      setOpen(false);
    },
    onError: () => {
      toast({
        title: _(msg`保存に失敗しました`),
        description: _(msg`設定内容を確認してください。`),
        variant: 'destructive',
      });
    },
  });

  const onAddVariable = useCallback(() => {
    append({ name: '', type: 'text', required: false });
  }, [append]);

  const onOpenChange = (nextOpen: boolean) => setOpen(nextOpen);

  const onSubmit = useMemo(
    () =>
      form.handleSubmit(async (values) => {
        const payload: TUpdateAutomationSettingsRequestSchema = {
          templateId,
          automationSettings: {
            ...(automationSettings ?? {
              approval: { enabled: false, rejectToDraft: true },
            }),
            mergeVariables: values.variables,
            signingOrderLock: values.signingOrderLocked
              ? { locked: true, order: values.signingOrderType }
              : { locked: false },
            requireEmailOtp: values.requireEmailOtp,
          },
        };

        await updateAutomationSettings(payload);
      }),
    [form, templateId, automationSettings, updateAutomationSettings],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild={true}>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Trans>変数を管理</Trans>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent position="center">
        <DialogHeader>
          <DialogTitle>
            <Trans>差し込み変数の管理</Trans>
          </DialogTitle>

          <DialogDescription>
            <Trans>
              変数を定義すると、テンプレートのフィールドに`{'{{変数名}}'}
              '`の形式で差し込めます。送信時に値を入力して契約書ごとに内容を切り替えられます。
            </Trans>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-y-4">
            <div className="flex max-h-[400px] flex-col gap-y-3 overflow-y-auto rounded-md border p-3">
              {fields.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  <Trans>変数が定義されていません。「変数を追加」から作成してください。</Trans>
                </p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-x-2">
                  <FormField
                    control={form.control}
                    name={`variables.${index}.name`}
                    render={({ field: nameField }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="sr-only">{_(msg`変数名`)}</FormLabel>

                        <FormControl>
                          <Input placeholder={_(msg`例: 取引先名`)} {...nameField} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variables.${index}.type`}
                    render={({ field: typeField }) => (
                      <FormItem className="w-32">
                        <FormLabel className="sr-only">{_(msg`型`)}</FormLabel>

                        <Select onValueChange={typeField.onChange} value={typeField.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            <SelectItem value="text">
                              <Trans>テキスト</Trans>
                            </SelectItem>
                            <SelectItem value="number">
                              <Trans>数値</Trans>
                            </SelectItem>
                            <SelectItem value="currency">
                              <Trans>金額(円)</Trans>
                            </SelectItem>
                            <SelectItem value="date">
                              <Trans>日付</Trans>
                            </SelectItem>
                            <SelectItem value="wareki">
                              <Trans>和暦日付</Trans>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variables.${index}.required`}
                    render={({ field: requiredField }) => (
                      <FormItem className="flex w-16 flex-col items-center gap-y-1 pb-1">
                        <FormLabel className="text-muted-foreground text-xs">
                          <Trans>必須</Trans>
                        </FormLabel>

                        <FormControl>
                          <Switch checked={requiredField.value} onCheckedChange={requiredField.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trans>削除</Trans>
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-y-3 rounded-md border bg-muted/30 p-3">
              <h4 className="font-semibold text-foreground text-sm">
                <Trans>セキュリティと送信制御</Trans>
              </h4>

              <FormField
                control={form.control}
                name="signingOrderLocked"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="font-medium text-sm">
                        <Trans>署名順の固定化</Trans>
                      </FormLabel>
                      <p className="text-muted-foreground text-xs">
                        <Trans>送信時に宛先の署名順序変更をロックします</Trans>
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('signingOrderLocked') && (
                <FormField
                  control={form.control}
                  name="signingOrderType"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between pl-4">
                      <FormLabel className="text-muted-foreground text-xs">
                        <Trans>固定順序プリセット</Trans>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 w-48 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="counterparty-first">
                            <Trans>先方 → 自社</Trans>
                          </SelectItem>
                          <SelectItem value="company-first">
                            <Trans>自社 → 先方</Trans>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="requireEmailOtp"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between border-t pt-2">
                    <div className="space-y-0.5">
                      <FormLabel className="font-medium text-sm">
                        <Trans>メールOTP本人確認を必須化 (Secure by Default)</Trans>
                      </FormLabel>
                      <p className="text-muted-foreground text-xs">
                        <Trans>受取人全員にメールワンタイムパスワードによる本人確認を自動適用します</Trans>
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Button type="button" variant="outline" size="sm" onClick={onAddVariable}>
                <Trans>変数を追加</Trans>
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                <Trans>キャンセル</Trans>
              </Button>

              <Button type="submit" loading={isPending}>
                <Trans>保存</Trans>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
