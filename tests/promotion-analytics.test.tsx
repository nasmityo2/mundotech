/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import TrackPromotionView, {
  trackSelectPromotion,
} from '@/app/components/TrackPromotion';
import PromotionLink from '@/app/components/PromotionLink';

const trackMock = vi.fn<(...args: unknown[]) => boolean>(() => true);

vi.mock('@/lib/ga4', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ga4')>('@/lib/ga4');
  return {
    ...actual,
    track: (...args: unknown[]) => trackMock(...args),
  };
});

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

const promotion = {
  promotion_id: 'promo-1',
  promotion_name: 'Banner verano',
  creative_name: 'summer',
  creative_slot: 'home_promo_banners_1',
};

describe('promotion analytics', () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('view_promotion se deduplica por montaje', () => {
    const { rerender } = render(<TrackPromotionView promotion={promotion} />);
    rerender(<TrackPromotionView promotion={promotion} />);
    expect(
      trackMock.mock.calls.filter((c) => c[0] === 'view_promotion'),
    ).toHaveLength(1);
  });

  it('select_promotion usa payload correcto', () => {
    trackSelectPromotion(promotion);
    expect(trackMock).toHaveBeenCalledWith(
      'select_promotion',
      expect.objectContaining({
        promotion_id: 'promo-1',
        promotion_name: 'Banner verano',
        creative_name: 'summer',
        creative_slot: 'home_promo_banners_1',
      }),
    );
  });

  it('PromotionLink dispara select_promotion al clic', () => {
    const { getByText } = render(
      <PromotionLink href="/productos" promotion={promotion}>
        Ver
      </PromotionLink>,
    );
    fireEvent.click(getByText('Ver'));
    expect(
      trackMock.mock.calls.some((c) => c[0] === 'select_promotion'),
    ).toBe(true);
  });
});
