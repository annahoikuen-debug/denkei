import { DateTime } from 'luxon';

/**
 * フェーズ2 ステップ29・30: 進捗ダッシュボード用の滞留・期限計算ユーティリティ
 *
 * tRPC の find-envelopes 系クエリから受取人ステータスを元に
 * 「現在の署名者・滞留日数・期限までの日数」を計算する(純関数)。
 */

export type DashboardEnvelopeStatus = 'awaiting-approval' | 'in-progress' | 'completed' | 'expired';

export type DashboardRecipientInfo = {
    signingStatus: 'NOT_SIGNED' | 'SIGNED' | string;
    role: string;
    name?: string | null;
    email: string;
};

/**
 * エンベロープのダッシュボード4列分類を計算する。
 *
 * - awaiting-approval: 未送信(DRAFT 等の承認待ち)
 * - in-progress: 署名中(送信済み・未完了)
 * - completed: 締結済み
 * - expired: 期限切れ recipient が存在し未完了
 */
export const computeDashboardStatus = ({
    status,
    sentAt,
    completedAt,
    hasExpiredRecipient,
}: {
    status: string;
    sentAt?: Date | null;
    completedAt?: Date | null;
    hasExpiredRecipient?: boolean;
}): DashboardEnvelopeStatus => {
    if (completedAt || status === 'COMPLETED') {
        return 'completed';
    }

    if (hasExpiredRecipient) {
        return 'expired';
    }

    if (sentAt || status === 'PENDING') {
        return 'in-progress';
    }

    return 'awaiting-approval';
};

/**
 * 現在の署名待ち recipient(未署名の SIGNER)を返す。
 */
export const getCurrentSigners = (recipients: DashboardRecipientInfo[]): DashboardRecipientInfo[] => {
    return recipients.filter((r) => r.role === 'SIGNER' && r.signingStatus === 'NOT_SIGNED');
};

/**
 * 送信からの滞留日数(切り捨て)を返す。未送信は null。
 */
export const computeStaleDays = ({
    sentAt,
    now = DateTime.now(),
}: {
    sentAt?: Date | string | null;
    now?: DateTime;
}): number | null => {
    if (!sentAt) {
        return null;
    }

    const sent = typeof sentAt === 'string' ? DateTime.fromISO(sentAt) : DateTime.fromJSDate(sentAt);

    return Math.floor(now.diff(sent, 'days').days);
};

/**
 * 期限までの日数を返す。期限未設定は null、期限切れは負値。
 */
export const computeDaysUntilExpiration = ({
    expiresAt,
    now = DateTime.now(),
}: {
    expiresAt?: Date | string | null;
    now?: DateTime;
}): number | null => {
    if (!expiresAt) {
        return null;
    }

    const expires = typeof expiresAt === 'string' ? DateTime.fromISO(expiresAt) : DateTime.fromJSDate(expiresAt);

    return Math.floor(expires.diff(now, 'days').days);
};

/**
 * 滞留バッジの表示ラベル種別を返す。
 */
export const computeStaleBadgeKind = ({
    staleDays,
    daysUntilExpiration,
}: {
    staleDays: number | null;
    daysUntilExpiration: number | null;
}): 'none' | 'normal' | 'warning' | 'danger' => {
    if (daysUntilExpiration !== null && daysUntilExpiration < 0) {
        return 'danger';
    }

    if (daysUntilExpiration !== null && daysUntilExpiration <= 3) {
        return 'warning';
    }

    if (staleDays !== null && staleDays >= 7) {
        return 'warning';
    }

    if (staleDays !== null) {
        return 'normal';
    }

    return 'none';
};
