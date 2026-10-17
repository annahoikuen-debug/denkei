import { Trans } from '@lingui/react/macro';

import { Button, Column, Img, Section, Text } from '../components';
import { getEmailAssetUrl } from '../utils/asset-url';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentCompletedProps {
  downloadLink: string;
  documentName: string;
  assetBaseUrl: string;
  customBody?: string;
}

export const TemplateDocumentCompleted = ({
  downloadLink,
  documentName,
  assetBaseUrl,
  customBody,
}: TemplateDocumentCompletedProps) => {
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Section className="mb-4">
          <Column align="center">
            <Text className="font-semibold text-base text-foreground">
              <Img
                src={getEmailAssetUrl(assetBaseUrl, 'static/completed.png')}
                className="-mt-0.5 mr-2 inline h-7 w-7 align-middle"
                alt=""
              />
              <Trans>Completed</Trans>
            </Text>
          </Column>
        </Section>

        <Text className="mb-0 text-center font-semibold text-foreground text-lg">
          {customBody || <Trans>“{documentName}” was signed by all signers</Trans>}
        </Text>

        <Text className="my-1 text-center text-base text-muted-foreground">
          <Trans>Continue by downloading the document.</Trans>
        </Text>

        <Section className="mt-8 mb-6 text-center">
          <Button
            className="rounded-lg border border-border border-solid px-4 py-2 text-center font-medium text-foreground text-sm no-underline"
            href={downloadLink}
          >
            <Img
              src={getEmailAssetUrl(assetBaseUrl, 'static/download.png')}
              className="mr-2 mb-0.5 inline h-5 w-5 align-middle"
              alt=""
            />
            <Trans>Download</Trans>
          </Button>
        </Section>

        {/* 公式法的保全証明バッジ (デンケイ) */}
        <Section className="my-6 rounded-lg border border-emerald-500/30 border-solid bg-emerald-50/50 p-4 text-center">
          <Text className="m-0 font-bold text-emerald-800 text-xs">
            🔒 デンケイ電子契約プラットフォームにより非改ざん性・ハッシュチェーン検証済み
          </Text>
          <Text className="mt-1 mb-0 text-[11px] text-emerald-700 leading-relaxed">
            本書面は電子署名法第2条・第3条および民法第522条第2項に準拠し、国税庁公認の事務処理規程に基づき適法に保全されています。税務調査等にもそのまま電磁的記録として提示いただけます。
          </Text>
        </Section>

        {/* バイラル紹介導線 (自然なフッター前バナー) */}
        <Section className="mt-6 mb-2 rounded-lg border border-red-500/40 border-dashed bg-red-50/30 p-3.5 text-center">
          <Text className="m-0 font-bold text-red-700 text-xs">貴社でも電子契約を導入しませんか？</Text>
          <Text className="mt-1 mb-2 text-[11px] text-muted-foreground leading-snug">
            デンケイなら月3件まで完全無料。有料プランも100件定額・月額2,980円。
          </Text>
          <Button
            className="inline-block rounded-md bg-red-600 px-3.5 py-1.5 font-bold text-white text-xs no-underline"
            href="https://denkei.jp?ref=completed_email"
          >
            無料で電子契約をはじめる →
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateDocumentCompleted;
