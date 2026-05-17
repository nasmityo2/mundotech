import { readSettings } from '@/lib/data-store';
import CheckoutFlow from '@/app/components/checkout/CheckoutFlow';

// Fuerza renderizado dinámico (por-request) para que readSettings()
// lea la configuración actual de la BD en cada visita.
export const dynamic = 'force-dynamic';

/**
 * Server Component: lee los datos de pago de la tienda desde la BD
 * y los pasa al flujo interactivo de checkout (Client Component).
 */
export default async function CheckoutPage() {
  const settings = await readSettings();

  return (
    <CheckoutFlow
      pagoMovil={settings.pagoMovil}
      transferencia={settings.transferencia}
    />
  );
}
