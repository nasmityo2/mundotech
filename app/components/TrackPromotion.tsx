'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/ga4';

export type PromotionTrackingPayload = {
  promotion_id: string;
  promotion_name: string;
  creative_name?: string;
  creative_slot: string;
};

/**
 * Dispara view_promotion una sola vez por montaje / promotion_id.
 * No-op sin consentimiento ni GA4.
 */
export default function TrackPromotionView({
  promotion,
}: {
  promotion: PromotionTrackingPayload;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    if (!promotion.promotion_id) return;
    sent.current = true;
    track('view_promotion', {
      promotion_id: promotion.promotion_id,
      promotion_name: promotion.promotion_name,
      ...(promotion.creative_name
        ? { creative_name: promotion.creative_name }
        : {}),
      creative_slot: promotion.creative_slot,
    });
  }, [promotion]);

  return null;
}

export function trackSelectPromotion(promotion: PromotionTrackingPayload): void {
  track('select_promotion', {
    promotion_id: promotion.promotion_id,
    promotion_name: promotion.promotion_name,
    ...(promotion.creative_name
      ? { creative_name: promotion.creative_name }
      : {}),
    creative_slot: promotion.creative_slot,
  });
}
