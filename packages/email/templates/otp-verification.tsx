import { Body, Container, Head, Html, Preview, Section, Text } from '../components';
import { TemplateBrandingLogo } from '../template-components/template-branding-logo';
import { TemplateFooter } from '../template-components/template-footer';

/**
 * フェーズ2 ステップ5: OTP 送信メールテンプレート(ja)
 */
export type OtpVerificationEmailProps = {
  otpCode: string;
  documentName: string;
  expiresMinutes: number;
  assetBaseUrl?: string;
};

export const OtpVerificationEmailTemplate = ({
  otpCode,
  documentName,
  expiresMinutes = 10,
  assetBaseUrl = 'http://localhost:3002',
}: OtpVerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Body className="mx-auto my-auto bg-background font-sans">
        <Preview>本人確認コード: {otpCode}</Preview>

        <Section>
          <Container className="mx-auto mt-8 mb-2 max-w-xl rounded-lg border border-border border-solid p-4 backdrop-blur-sm">
            <Section>
              <TemplateBrandingLogo assetBaseUrl={assetBaseUrl} className="mb-4 h-6" />

              <Text className="mt-4 font-semibold text-base text-foreground">署名前の本人確認</Text>

              <Text className="text-foreground text-sm">
                「{documentName}」に署名するため、以下の確認コードを入力してください。
              </Text>

              <Text className="my-6 text-center font-bold text-4xl tracking-[0.5em]" data-testid="otp-email-code">
                {otpCode}
              </Text>

              <Text className="text-muted-foreground text-sm">このコードの有効期限は {expiresMinutes} 分です。</Text>

              <Text className="text-muted-foreground text-sm">
                お心当たりのない場合は、このメールを破棄してください。
              </Text>
            </Section>
          </Container>

          <div className="mx-auto mt-8 max-w-xl">
            <TemplateFooter />
          </div>
        </Section>
      </Body>
    </Html>
  );
};

export default OtpVerificationEmailTemplate;
