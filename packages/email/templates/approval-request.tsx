import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { Body, Button, Container, Head, Html, Preview, Section, Text } from '../components';
import { TemplateBrandingLogo } from '../template-components/template-branding-logo';
import { TemplateFooter } from '../template-components/template-footer';

export type ApprovalRequestEmailProps = {
  approverName?: string;
  senderName: string;
  documentTitle: string;
  approvalLink: string;
  assetBaseUrl?: string;
};

export const ApprovalRequestEmail = ({
  approverName = '承認者様',
  senderName = '送信者',
  documentTitle = '業務委託契約書.pdf',
  approvalLink = 'https://denkei.example.com/approvals',
  assetBaseUrl = 'http://localhost:3002',
}: ApprovalRequestEmailProps) => {
  const { _ } = useLingui();

  const previewText = _(msg`【要承認】${senderName}様より「${documentTitle}」の社内承認依頼が届いています`);

  return (
    <Html>
      <Head />
      <Body className="mx-auto my-auto bg-background font-sans">
        <Preview>{previewText}</Preview>
        <Section>
          <Container className="mx-auto mt-8 mb-2 max-w-xl rounded-lg border border-border border-solid p-6 backdrop-blur-sm">
            <Section>
              <TemplateBrandingLogo assetBaseUrl={assetBaseUrl} className="mb-4 h-6" />
              <Text className="font-semibold text-foreground text-lg">
                <Trans>{approverName} 様</Trans>
              </Text>
              <Text className="mt-2 text-base text-muted-foreground leading-relaxed">
                <Trans>
                  {senderName} 様より、以下の契約書の社内承認が依頼されました。
                  内容をご確認のうえ、承認または差し戻しの操作をお願いいたします。
                </Trans>
              </Text>
              <Section className="my-6 rounded-md border border-border bg-muted/50 p-4">
                <Text className="m-0 font-medium text-muted-foreground text-sm">文書名:</Text>
                <Text className="m-0 mt-1 font-bold text-base text-foreground">{documentTitle}</Text>
              </Section>
              <Section className="my-6 text-center">
                <Button
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-base text-primary-foreground no-underline shadow-sm"
                  href={approvalLink}
                >
                  <Trans>契約書を確認して承認する</Trans>
                </Button>
              </Section>
              <Text className="mt-4 text-muted-foreground text-xs">
                <Trans>※このメールは電子契約システム「デンケイ」の承認ワークフローより自動送信されています。</Trans>
              </Text>
            </Section>
          </Container>
          <Container className="mx-auto max-w-xl">
            <TemplateFooter />
          </Container>
        </Section>
      </Body>
    </Html>
  );
};

export default ApprovalRequestEmail;
