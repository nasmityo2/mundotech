import type { Metadata } from 'next';
import { readSettings } from '@/lib/data-store';
import { readShippingEstimates } from '@/lib/shipping-estimates-db';
import { isWhatsAppCheckout } from '@/lib/checkout-mode';
import CheckoutFlow from '@/app/components/checkout/CheckoutFlow';
import WhatsAppCheckout from '@/app/components/checkout/WhatsAppCheckout';

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
 * Según CHECKOUT_MODE renderiza WhatsAppCheckout (una sola página)
 * o CheckoutFlow (pasos: Envío → Pago → Revisión).
 */
export default async function CheckoutPage() {
  const [settings, shippingEstimates] = await Promise.all([
    readSettings(),
    readShippingEstimates(),
  ]);

  if (isWhatsAppCheckout) {
    return (
      <WhatsAppCheckout
        pagoMovil={settings.pagoMovil}
        transferencia={settings.transferencia}
        supportPhone={settings.phone}
        binancePayId={settings.binancePayId}
        binanceQrUrl={settings.binanceQrUrl}
        shippingEstimates={shippingEstimates}
        whatsappOrderPhone={settings.whatsappOrderPhone}
        storeName={settings.storeName}
      />
    );
  }

  return (
    <CheckoutFlow
      pagoMovil={settings.pagoMovil}
      transferencia={settings.transferencia}
      supportPhone={settings.phone}
      binancePayId={settings.binancePayId}
      binanceQrUrl={settings.binanceQrUrl}
      shippingEstimates={shippingEstimates}
      whatsappMode={false}
      whatsappOrderPhone={settings.whatsappOrderPhone}
      storeName={settings.storeName}
    />
  );
}
