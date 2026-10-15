/**
 * フェーズ2 ステップ13: eKYC(HIGH レベル本人確認)の抽象化
 *
 * 外部 eKYC(書類+自撮り)API のインターフェースとモック実装。
 * 実 API 連携は別途契約後にプラグインとして追加する。
 */

export type EkycProviderId = 'mock';

export type EkycStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type EkycCreateSessionRequest = {
    recipientId: number;
    envelopeId: string;
    /** コールバック URL(検証完了後のリダイレクト先) */
    callbackUrl: string;
};

export type EkycCreateSessionResult = {
    sessionId: string;
    /** ユーザーが eKYC フローを開始するための URL */
    redirectUrl: string;
    providerId: EkycProviderId;
};

export type EkycCheckResult = {
    sessionId: string;
    status: EkycStatus;
    /** APPROVED の場合の検証完了日時 */
    verifiedAt?: Date;
    /** REJECTED の場合の理由コード */
    rejectionReason?: string;
};

export interface IEkycProvider {
    readonly providerId: EkycProviderId;

    createSession(request: EkycCreateSessionRequest): Promise<EkycCreateSessionResult>;
    checkSession(sessionId: string): Promise<EkycCheckResult>;
}

/**
 * モック eKYC プロバイダ。
 * sessionId 'mock-approve-*' または callbackUrl に ?approve=1 が付くと APPROVED。
 */
export class MockEkycProvider implements IEkycProvider {
    readonly providerId = 'mock' as const;

    async createSession(request: EkycCreateSessionRequest): Promise<EkycCreateSessionResult> {
        const sessionId = `mock-ekyc-${request.recipientId}-${Date.now()}`;

        return {
            sessionId,
            redirectUrl: `${request.callbackUrl}?ekycSession=${sessionId}`,
            providerId: this.providerId,
        };
    }

    async checkSession(sessionId: string): Promise<EkycCheckResult> {
        if (sessionId.startsWith('mock-ekyc-approved')) {
            return { sessionId, status: 'APPROVED', verifiedAt: new Date() };
        }

        if (sessionId.startsWith('mock-ekyc-rejected')) {
            return { sessionId, status: 'REJECTED', rejectionReason: 'document_mismatch' };
        }

        // 既定は承認扱い(モックフロー通過用)
        return { sessionId, status: 'APPROVED', verifiedAt: new Date() };
    }
}

/**
 * eKYC プロバイダファクトリ。実 API 連携はここに追加する。
 */
export const getEkycProvider = (): IEkycProvider => {
    return new MockEkycProvider();
};
