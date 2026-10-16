import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react';
import { Link } from 'react-router';

export type PlanLimitUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamUrl?: string;
  limitCount?: number;
  currentPlanLabel?: string;
};

export function PlanLimitUpgradeDialog({
  open,
  onOpenChange,
  teamUrl,
  limitCount = 3,
  currentPlanLabel = '無料プラン',
}: PlanLimitUpgradeDialogProps) {
  const billingHref = teamUrl ? `/t/${teamUrl}/settings/billing` : '/settings/billing';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 sm:p-8" data-testid="plan-limit-upgrade-dialog">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="font-bold">
              月次送信上限に達しました
            </Badge>
            <span className="text-muted-foreground text-xs">
              {currentPlanLabel}（月{limitCount}件）
            </span>
          </div>
          <DialogTitle className="font-black text-foreground text-xl leading-snug tracking-tight sm:text-2xl">
            中小応援スタンダードで
            <br />
            月100件まで契約送信を拡大
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            無料プランの月間送信可能枠（{limitCount}件）をすべて使用しました。
            「中小応援スタンダードプラン」へアップグレードすると、月額2,980円で100件まで送信可能です。
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-bold text-foreground text-sm">中小応援スタンダード（月額定額）</span>
            <span className="font-black text-lg text-red-600">
              ¥2,980 <span className="font-normal text-muted-foreground text-xs">/月</span>
            </span>
          </div>
          <ul className="space-y-1.5 text-muted-foreground text-xs">
            <li className="flex items-center gap-2">
              <CheckCircle2Icon className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>月間 100件までの電子契約送信（1通あたり約29.8円）</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2Icon className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>会社角印・代表取締役丸印・カスタム印影</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2Icon className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>自社送信元・Reply-Toメール設定＆電帳法出力パック</span>
            </li>
          </ul>
        </div>

        {/* 提案4: スポットチケット都度買いオプション */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/40 p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-xs">月額を払わずに今月だけ送りたい場合</span>
            <Badge variant="outline" className="font-semibold text-[10px] text-muted-foreground">
              都度買い・有効期限1年
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              to={`${billingHref}?ticket=PACK_10`}
              onClick={() => onOpenChange(false)}
              className="group flex flex-col items-center justify-center rounded-lg border border-border bg-background p-2.5 text-center transition-all hover:border-primary"
            >
              <span className="font-bold text-foreground group-hover:text-primary">10件チケット</span>
              <span className="mt-0.5 font-black text-foreground text-sm">¥1,500</span>
              <span className="text-[10px] text-muted-foreground">（150円/件）</span>
            </Link>

            <Link
              to={`${billingHref}?ticket=PACK_50`}
              onClick={() => onOpenChange(false)}
              className="group flex flex-col items-center justify-center rounded-lg border border-border bg-background p-2.5 text-center transition-all hover:border-primary"
            >
              <span className="font-bold text-foreground group-hover:text-primary">50件チケット</span>
              <span className="mt-0.5 font-black text-foreground text-sm">¥5,000</span>
              <span className="text-[10px] text-muted-foreground">（100円/件）</span>
            </Link>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row">
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            閉じる
          </Button>
          <Button
            asChild
            className="w-full bg-gradient-to-r from-red-600 to-red-700 font-bold text-white shadow-md shadow-red-600/20 hover:from-red-700 hover:to-red-800 sm:w-auto"
          >
            <Link to={billingHref} onClick={() => onOpenChange(false)}>
              <span>プランをアップグレード</span>
              <ArrowRightIcon className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
