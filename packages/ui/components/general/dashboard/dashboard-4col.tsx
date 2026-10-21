import { cn } from '../../../lib/utils';

/**
 * フェーズ2 ステップ30: 進捗ダッシュボード 4列ビュー
 *
 * 「承認待ち / 署名中 / 締結済み / 期限切れ」の4列+滞留バッジ。
 * モバイルでは1列縦積み(grid-cols-1 → md で 4 列)。
 */

export type DashboardColumnStatus = 'awaiting-approval' | 'in-progress' | 'completed' | 'expired';

export type DashboardCard = {
  id: string;
  title: string;
  status: DashboardColumnStatus;
  currentSigner?: string | null;
  staleDays?: number | null;
  daysUntilExpiration?: number | null;
};

export type DashboardStaleBadgeKind = 'none' | 'normal' | 'warning' | 'danger';

const COLUMN_LABELS: Record<DashboardColumnStatus, string> = {
  'awaiting-approval': '承認待ち',
  'in-progress': '署名中',
  completed: '締結済み',
  expired: '期限切れ',
};

const COLUMN_TESTIDS: Record<DashboardColumnStatus, string> = {
  'awaiting-approval': 'dashboard-column-awaiting-approval',
  'in-progress': 'dashboard-column-in-progress',
  completed: 'dashboard-column-completed',
  expired: 'dashboard-column-expired',
};

const BADGE_STYLES: Record<DashboardStaleBadgeKind, string> = {
  none: 'hidden',
  normal: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export type Dashboard4ColProps = {
  cards: DashboardCard[];
  badgeKinds: Record<string, DashboardStaleBadgeKind>;
  className?: string;
};

export const Dashboard4Col = ({ cards, badgeKinds, className }: Dashboard4ColProps) => {
  const columns: DashboardColumnStatus[] = ['awaiting-approval', 'in-progress', 'completed', 'expired'];

  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-4', className)} data-testid="dashboard-4col">
      {columns.map((column) => {
        const columnCards = cards.filter((c) => c.status === column);

        return (
          <section
            key={column}
            className="rounded-lg border bg-muted/30 p-3"
            data-testid={COLUMN_TESTIDS[column]}
            aria-label={COLUMN_LABELS[column]}
          >
            <h2 className="mb-3 font-medium text-muted-foreground text-sm">
              {COLUMN_LABELS[column]}
              <span className="ml-1">({columnCards.length})</span>
            </h2>

            <ul className="space-y-2">
              {columnCards.map((card) => (
                <li
                  key={card.id}
                  className="rounded-md border bg-background p-3 text-sm"
                  data-testid={`dashboard-card-${card.id}`}
                >
                  <p className="truncate font-medium" title={card.title}>
                    {card.title}
                  </p>

                  {card.currentSigner && (
                    <p className="mt-1 text-muted-foreground text-xs">署名待ち: {card.currentSigner}</p>
                  )}

                  <span
                    className={cn(
                      'mt-2 inline-block rounded-full px-2 py-0.5 text-xs',
                      BADGE_STYLES[badgeKinds[card.id] ?? 'none'],
                    )}
                    data-testid={`dashboard-badge-${card.id}`}
                  >
                    {renderBadgeLabel(card)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

const renderBadgeLabel = (card: DashboardCard): string => {
  if (card.daysUntilExpiration !== null && card.daysUntilExpiration !== undefined) {
    if (card.daysUntilExpiration < 0) {
      return `期限超過 ${Math.abs(card.daysUntilExpiration)}日`;
    }

    return `残り ${card.daysUntilExpiration}日`;
  }

  if (card.staleDays !== null && card.staleDays !== undefined) {
    return `${card.staleDays}日滞留`;
  }

  return '';
};
