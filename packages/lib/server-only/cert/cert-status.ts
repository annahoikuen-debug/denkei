import { X509Certificate } from 'node:crypto';
import { createLocalSigner } from '@documenso/signing/transports/local';
import { NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY, NEXT_PRIVATE_SIGNING_TRANSPORT } from '../../constants/app';

/**
 * Whether the local P12 opens with the configured passphrase and is in date.
 * Skips AIA so this stays offline. gcloud-hsm and csc always report available.
 */
export const getCertificateStatus = async () => {
  const transport = NEXT_PRIVATE_SIGNING_TRANSPORT();

  // Cannot inspect a remote HSM or CSC provider from this process.
  if (transport === 'gcloud-hsm' || transport === 'csc') {
    return { isAvailable: true, hasTimestampAuthority: hasTimestampAuthorityConfigured() };
  }

  // Anything else (typo, leftover `http`) would throw at seal time.
  if (transport !== 'local') {
    return { isAvailable: false, hasTimestampAuthority: hasTimestampAuthorityConfigured() };
  }

  try {
    const signer = await createLocalSigner({ buildChain: false });

    const certificate = new X509Certificate(Buffer.from(signer.certificate));

    const now = new Date();

    const isWithinValidityPeriod = new Date(certificate.validFrom) <= now && now <= new Date(certificate.validTo);

    return {
      isAvailable: isWithinValidityPeriod,
      hasTimestampAuthority: hasTimestampAuthorityConfigured(),
    };
  } catch {
    return { isAvailable: false, hasTimestampAuthority: hasTimestampAuthorityConfigured() };
  }
};

/**
 * フェーズ1 ステップ30: タイムスタンプ(RFC3161)設定の有無を返す。
 * UI の検証バッジ(「電子署名: 有効 / タイムスタンプ: あり」)で使用する。
 */
export const hasTimestampAuthorityConfigured = (): boolean => {
  return Boolean(NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY());
};
