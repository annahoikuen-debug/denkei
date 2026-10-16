import {
  NEXT_PRIVATE_SIGNING_REASON,
  NEXT_PRIVATE_SIGNING_TRANSPORT,
  NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER,
  NEXT_PUBLIC_SIGNING_CONTACT_INFO,
  NEXT_PUBLIC_WEBAPP_URL,
} from '@documenso/lib/constants/app';
import type { PDF, Signer } from '@libpdf/core';
import { match } from 'ts-pattern';

import { getTimestampAuthority, getTsaFallbackPolicy, tsaCircuitBreaker } from './helpers/tsa';
import { createGoogleCloudSigner } from './transports/google-cloud';
import { createLocalSigner } from './transports/local';

export type SignOptions = {
  pdf: PDF;
};

let signer: Signer | null = null;

/**
 * フェーズ1 ステップ28: 本番署名トランスポートの標準化
 *
 * 本番(NODE_ENV=production)では P12 ベースの `local` トランスポートを禁止し、
 * `gcloud-hsm` を必須とする。誤設定時は起動(初回署名)時に失敗させる。
 */
const assertTransportAllowedForEnvironment = (transport: string) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && transport === 'local' && process.env.NEXT_PRIVATE_SIGNING_ALLOW_LOCAL_IN_PRODUCTION !== 'true') {
    throw new Error(
      '[signing] The "local" (P12) signing transport is not allowed in production without explicit opt-in. ' +
        'Configure NEXT_PRIVATE_SIGNING_TRANSPORT=gcloud-hsm, or set ' +
        'NEXT_PRIVATE_SIGNING_ALLOW_LOCAL_IN_PRODUCTION=true for self-hosted SMB deployments.',
    );
  }
};

const getSigner = async () => {
  if (signer) {
    return signer;
  }

  const transport = NEXT_PRIVATE_SIGNING_TRANSPORT();

  assertTransportAllowedForEnvironment(transport);

  // eslint-disable-next-line require-atomic-updates
  signer = await match(transport)
    .with('local', async () => await createLocalSigner())
    .with('gcloud-hsm', async () => await createGoogleCloudSigner())
    .otherwise(() => {
      throw new Error(`Unsupported signing transport: ${transport}`);
    });

  return signer;
};

export const signPdf = async ({ pdf }: SignOptions) => {
  const signer = await getSigner();

  const tsa = getTimestampAuthority();

  try {
    const { bytes } = await pdf.sign({
      signer,
      reason: NEXT_PRIVATE_SIGNING_REASON(),
      location: NEXT_PUBLIC_WEBAPP_URL(),
      contactInfo: NEXT_PUBLIC_SIGNING_CONTACT_INFO(),
      subFilter: NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER() ? 'adbe.pkcs7.detached' : 'ETSI.CAdES.detached',
      timestampAuthority: tsa ?? undefined,
      longTermValidation: !!tsa,
      archivalTimestamp: !!tsa,
      // A B-LTA signature (signer chain + RFC 3161 timestamp token + LTV
      // revocation data) can exceed the 12288-byte default placeholder,
      // depending on the signing certificate chain and the TSA responder.
      // The unused portion is zero-padding, so over-reserving is cheap.
      estimatedSize: tsa ? 32768 : undefined,
    });

    if (tsa) {
      tsaCircuitBreaker.recordSuccess();
    }

    return bytes;
  } catch (error) {
    if (tsa) {
      tsaCircuitBreaker.recordFailure();

      const policy = getTsaFallbackPolicy();
      if (policy === 'continue') {
        console.warn(
          '[signing] TSA error during pdf.sign. Retrying without TSA due to fallback policy=continue',
          error,
        );

        // Fallback retry without TSA
        const { bytes } = await pdf.sign({
          signer,
          reason: NEXT_PRIVATE_SIGNING_REASON(),
          location: NEXT_PUBLIC_WEBAPP_URL(),
          contactInfo: NEXT_PUBLIC_SIGNING_CONTACT_INFO(),
          subFilter: NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER() ? 'adbe.pkcs7.detached' : 'ETSI.CAdES.detached',
          timestampAuthority: undefined,
          longTermValidation: false,
          archivalTimestamp: false,
        });

        return bytes;
      }
    }

    throw error;
  }
};
