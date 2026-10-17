import { SELF_HELP_GUIDE_ITEMS } from '@documenso/lib/universal/self-help-guide';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@documenso/ui/primitives/dialog';
import { Trans } from '@lingui/react/macro';
import { AlertTriangleIcon, HelpCircleIcon, MailIcon, ShieldCheckIcon, SmartphoneIcon } from 'lucide-react';
import { useState } from 'react';

export type RecipientHelpDialogProps = {
  trigger?: React.ReactNode;
};

export const RecipientHelpDialog = ({ trigger }: RecipientHelpDialogProps) => {
  const [open, setOpen] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'EMAIL_DELIVERY':
        return <MailIcon className="h-4 w-4 text-blue-500" />;
      case 'MOBILE_DEVICE':
        return <SmartphoneIcon className="h-4 w-4 text-emerald-500" />;
      case 'OTP_AUTH':
        return <AlertTriangleIcon className="h-4 w-4 text-amber-500" />;
      default:
        return <ShieldCheckIcon className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground text-xs hover:text-foreground"
          >
            <HelpCircleIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>
              <Trans>お困りの方へ（3秒解決ガイド）</Trans>
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-foreground">
            <HelpCircleIcon className="h-5 w-5 text-amber-500" />
            <DialogTitle>
              <Trans>署名・操作トラブルシューティング</Trans>
            </DialogTitle>
          </div>
          <DialogDescription>
            <Trans>メールが届かない、画面が動かない等の初歩的な疑問をすぐに解決できます。</Trans>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {SELF_HELP_GUIDE_ITEMS.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/80 bg-muted/30 p-4 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                {getCategoryIcon(item.category)}
                <span>{item.title}</span>
              </div>
              <p className="mt-1 font-medium text-muted-foreground">{item.summary}</p>

              <ul className="mt-2.5 space-y-1.5 rounded-lg bg-background p-3 text-foreground/90 shadow-inner">
                {item.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-primary">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>

              {item.tips && (
                <p className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                  💡 {item.tips}
                </p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
