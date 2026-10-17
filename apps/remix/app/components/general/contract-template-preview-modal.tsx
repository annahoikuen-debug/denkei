import { CONTRACT_TEMPLATES_META, type ContractTemplateKey } from '@documenso/lib/universal/contract-templates-meta';
import { Button } from '@documenso/ui/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@documenso/ui/primitives/dialog';
import { Check, Copy, ExternalLink, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router';

export type ContractTemplatePreviewModalProps = {
  templateKey: ContractTemplateKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ContractTemplatePreviewModal: React.FC<ContractTemplatePreviewModalProps> = ({
  templateKey,
  open,
  onOpenChange,
}) => {
  const meta = templateKey ? CONTRACT_TEMPLATES_META[templateKey] : null;

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (meta) {
      const initial: Record<string, string> = {};
      meta.variables.forEach((v) => {
        initial[v.name] = v.defaultValue;
      });
      setFormValues(initial);
    }
  }, [meta]);

  if (!templateKey || !meta) {
    return null;
  }

  const previewText = meta.fullTextPreview(formValues);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 font-bold text-xs ${meta.badgeColor}`}>
              {meta.badge}
            </span>
            <span className="font-semibold text-muted-foreground text-xs">
              全 {meta.articleCount} 条項・法的整合性チェック済
            </span>
          </div>
          <DialogTitle className="mt-1 font-black text-xl sm:text-2xl">{meta.title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">{meta.description}</DialogDescription>
        </DialogHeader>

        {/* 差し込み変数リアルタイム変更フォーム */}
        <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
            <Sparkles className="h-4 w-4 text-red-600" />
            <span>甲・乙・金額を入力するとプレビューが即時同期します</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {meta.variables.map((v) => (
              <div key={v.name} className="space-y-1">
                <label className="font-bold text-[11px] text-muted-foreground">{v.label}</label>
                <input
                  type="text"
                  value={formValues[v.name] || ''}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [v.name]: e.target.value,
                    }))
                  }
                  placeholder={v.placeholder}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 font-semibold text-xs focus:border-red-600 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 安心の注目条項ハイライト */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs">
          <div className="font-bold text-emerald-700 dark:text-emerald-400">
            🛡️ 注目条項の抜粋: {meta.sampleClause.title}
          </div>
          <p className="mt-1 text-muted-foreground leading-relaxed">{meta.sampleClause.content}</p>
        </div>

        {/* 契約書全文プレビュー */}
        <div className="relative">
          <div className="flex items-center justify-between pb-1.5">
            <span className="font-bold text-muted-foreground text-xs">契約書全文プレビュー（原本）</span>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
              {copied ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                  コピー完了
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  全文コピー
                </>
              )}
            </Button>
          </div>
          <pre className="max-h-60 select-all overflow-y-auto rounded-xl border border-border bg-card p-4 font-mono text-foreground text-xs leading-relaxed">
            {previewText}
          </pre>
        </div>

        {/* フッター誘導 */}
        <div className="flex flex-col items-center justify-between gap-3 border-border border-t pt-4 sm:flex-row">
          <span className="text-[11px] text-muted-foreground">
            ※ デンケイのアカウントがあれば、このひな形を1クリックで取引先に送信できます。
          </span>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full text-xs sm:w-auto"
            >
              閉じる
            </Button>
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="sm" className="w-full bg-red-600 font-bold text-white text-xs hover:bg-red-700">
                このひな形を使って無料送信
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
