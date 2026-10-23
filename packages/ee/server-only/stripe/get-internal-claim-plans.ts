import { stripe } from '@documenso/lib/server-only/stripe';
import { INTERNAL_CLAIM_ID, type InternalClaim, internalClaims } from '@documenso/lib/types/subscription';
import { toHumanPrice } from '@documenso/lib/universal/stripe/to-human-price';
import { clone } from 'remeda';
import type Stripe from 'stripe';

export type InternalClaimPlans = {
  [key in INTERNAL_CLAIM_ID]: InternalClaim & {
    monthlyPrice?: Stripe.Price & {
      product: Stripe.Product;
      isVisibleInApp: boolean;
      friendlyPrice: string;
    };
    yearlyPrice?: Stripe.Price & {
      product: Stripe.Product;
      isVisibleInApp: boolean;
      friendlyPrice: string;
    };
  };
};

/**
 * Returns the main Documenso plans from Stripe.
 */
export const getInternalClaimPlans = async (): Promise<InternalClaimPlans> => {
  const { data: prices } = await stripe.prices.search({
    query: `active:'true' type:'recurring'`,
    expand: ['data.product'],
    limit: 100,
  });

  const plans: InternalClaimPlans = clone(internalClaims);

  prices.forEach((price) => {
    // We use `expand` to get the product, but it's not typed as part of the Price type.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const product = price.product as Stripe.Product;

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const productClaimId = product.metadata.claimId as INTERNAL_CLAIM_ID | undefined;
    const isVisibleInApp = price.metadata.visibleInApp === 'true';

    if (!productClaimId || !Object.values(INTERNAL_CLAIM_ID).includes(productClaimId)) {
      return;
    }

    const isJpy = price.currency.toLowerCase() === 'jpy';
    let formattedPrice = isJpy
      ? `¥${(price.unit_amount ?? 0).toLocaleString()} (税込)`
      : `$${toHumanPrice(price.unit_amount ?? 0, price.currency)} ${price.currency.toUpperCase()}`.replace('.00', '');

    if (price.recurring?.interval === 'month') {
      if (product.metadata['isSeatBased'] === 'true' && !isJpy) {
        formattedPrice = `$50 ${price.currency.toUpperCase()}`;
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      plans[productClaimId].monthlyPrice = {
        ...price,
        isVisibleInApp,
        product,
        friendlyPrice: formattedPrice,
      };
    }

    if (price.recurring?.interval === 'year') {
      if (product.metadata['isSeatBased'] === 'true' && !isJpy) {
        formattedPrice = `$480 ${price.currency.toUpperCase()}`;
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      plans[productClaimId].yearlyPrice = {
        ...price,
        isVisibleInApp,
        product,
        friendlyPrice: formattedPrice,
      };
    }
  });

  return plans;
};
