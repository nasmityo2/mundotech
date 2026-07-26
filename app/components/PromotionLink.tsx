'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import TrackPromotionView, {
  trackSelectPromotion,
  type PromotionTrackingPayload,
} from '@/app/components/TrackPromotion';

type PromotionLinkProps = {
  href: string;
  promotion: PromotionTrackingPayload;
  className?: string;
  children: ReactNode;
};

/** Enlace promocional con view_promotion (montaje) + select_promotion (clic). */
export default function PromotionLink({
  href,
  promotion,
  className,
  children,
}: PromotionLinkProps) {
  return (
    <>
      <TrackPromotionView promotion={promotion} />
      <Link
        href={href}
        onClick={() => trackSelectPromotion(promotion)}
        className={className}
      >
        {children}
      </Link>
    </>
  );
}
