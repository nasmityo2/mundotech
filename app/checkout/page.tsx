import type { Metadata } from 'next';
import { readSettings } from '@/lib/data-store';
import { readShippingEstimates } from '@/lib/shipping-estimates-db';
import { isWhatsAppCheckout } from '@/lib/checkout-mode';
import CheckoutFlow from '@/app/components/checkout/CheckoutFlow';

// Fuerza renderizado dinámico (por-request) para que readSettings()
// lea la configuración actual de la BD en cada visita.
export const dynamic = 'force-dynamic';

// H03/P96: página transaccional — noindex para no desperdiciar crawl budget
// y evitar que usuarios accedan por SERP sin carrito.
export const metadata: Metadata = {
  title: 'Finalizar compra',
  robots: { index: false, follow: false },
};

/**
 * Server Component: lee los datos de pago de la tienda desde la BD
 * y los pasa al flujo interactivo de checkout (Client Component).
 */
export default async function CheckoutPage() {
  const [settings, shippingEstimates] = await Promise.all([
    readSettings(),
    readShippingEstimates(),
  ]);

  return (
    <CheckoutFlow
      pagoMovil={settings.pagoMovil}
      transferencia={settings.transferencia}
      supportPhone={settings.phone}
      binancePayId={settings.binancePayId}
      binanceQrUrl={settings.binanceQrUrl}
      shippingEstimates={shippingEstimates}
      whatsappMode={isWhatsAppCheckout}
      whatsappOrderPhone={settings.whatsappOrderPhone}
      storeName={settings.storeName}
    />
  );
}
