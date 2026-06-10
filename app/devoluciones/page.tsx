import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageLayout from '@/app/components/LegalPageLayout';
import { readSettings } from '@/lib/data-store';
import { whatsappHref } from '@/lib/mundotech-social';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotech.com.ve';
const PAGE_URL = `${SITE_URL}/devoluciones`;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Devoluciones y garantía',
  description:
    'Política de devoluciones y garantía de MundoTech Barquisimeto: 7 días para reportar defectos de fábrica, 12 meses de garantía gestionada directamente en nuestra tienda física.',
  alternates: { canonical: PAGE_URL },
};

const FAQ = [
  {
    q: '¿Cuánto tiempo tengo para reportar un producto defectuoso?',
    a: 'Tienes 7 días continuos desde que recibes el producto para reportar cualquier defecto de fábrica. Escríbenos por WhatsApp al 0412-1471338 con tu número de pedido y una foto o video del problema.',
  },
  {
    q: '¿Qué cubre la garantía de 12 meses?',
    a: 'Cubre fallas de fabricación del equipo en condiciones normales de uso. La gestionas directamente con nosotros en la tienda del C.C. Minicentro 34 en Barquisimeto — sin intermediarios. No cubre daños por golpes, humedad, mal uso o intervención de terceros.',
  },
  {
    q: '¿Cómo hago una devolución si compré por la web?',
    a: 'Contáctanos por WhatsApp o correo con tu número de pedido. Si el producto presenta defecto de fábrica dentro de los 7 días, coordinamos el cambio: puedes traerlo a la tienda o enviarlo por MRW/Zoom. Si el defecto se confirma, el costo del envío de retorno lo asumimos nosotros.',
  },
  {
    q: '¿Devuelven el dinero?',
    a: 'Nuestra primera opción siempre es cambiar el producto por uno nuevo igual. Si no hay stock, puedes elegir otro producto por el mismo valor o solicitar el reembolso por el mismo método con el que pagaste (Pago Móvil, transferencia o Binance), en un plazo de 3 a 5 días hábiles tras confirmar el defecto.',
  },
  {
    q: '¿Puedo devolver un producto porque me arrepentí de la compra?',
    a: 'Si el producto está sin abrir, con su empaque sellado y accesorios completos, puedes plantearnos el cambio dentro de los 7 días por otro producto de la tienda. Los productos abiertos o usados sin defecto de fábrica no aplican para devolución.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default async function DevolucionesPage() {
  const settings = await readSettings();
  const waHref = whatsappHref(
    settings.phone,
    'Hola MundoTech, necesito ayuda con una devolución o garantía. Mi número de pedido es: ',
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <LegalPageLayout
        title="Devoluciones y garantía"
        lastUpdated="Así trabajamos las garantías en MundoTech — claro y sin letra pequeña."
      >
        <p>
          Somos una tienda física en Barquisimeto y respondemos por lo que
          vendemos. Si algo llega mal o falla por defecto de fábrica, lo
          resolvemos directamente contigo: sin tickets eternos ni centros de
          servicio fantasma.
        </p>

        <h2>1. Revisión al recibir (7 días)</h2>
        <p>
          Revisa tu producto apenas lo recibas. Tienes <strong>7 días
          continuos</strong> desde la entrega para reportar cualquier defecto de
          fábrica, faltante o error en el pedido. Pasado ese plazo, aplica la
          garantía estándar del producto.
        </p>
        <ul>
          <li>Escríbenos por WhatsApp al <strong>{settings.phone}</strong> o al correo <strong>{settings.email}</strong>.</li>
          <li>Indica tu número de pedido y adjunta foto o video del problema.</li>
          <li>Te respondemos con los pasos a seguir — normalmente el mismo día hábil.</li>
        </ul>

        <h2>2. Garantía de 12 meses, directa con nosotros</h2>
        <p>
          Los equipos vendidos por MundoTech tienen <strong>12 meses de
          garantía por defectos de fabricación</strong>, gestionada directamente
          en nuestra tienda del C.C. Minicentro 34, Calle 22, Barquisimeto. Tú
          hablas con nosotros, no con un call center.
        </p>
        <p>La garantía <strong>no cubre</strong>:</p>
        <ul>
          <li>Daños por golpes, caídas, líquidos o humedad.</li>
          <li>Desgaste normal de piezas consumibles (baterías por uso, cables, fundas).</li>
          <li>Equipos intervenidos por servicios técnicos ajenos a la tienda.</li>
          <li>Mal uso o instalación distinta a la indicada por el fabricante.</li>
        </ul>

        <h2>3. Cambios y reembolsos</h2>
        <p>
          Confirmado el defecto, te ofrecemos en este orden: (a) cambio por un
          producto nuevo idéntico, (b) otro producto por el mismo valor, o
          (c) reembolso por el mismo método con el que pagaste — Pago Móvil,
          transferencia bancaria o Binance — en un plazo de 3 a 5 días hábiles.
        </p>

        <h2>4. Envíos de retorno</h2>
        <p>
          Si estás en Barquisimeto, puedes traer el producto a la tienda. Si
          estás en otra ciudad, lo envías por MRW o Zoom; cuando el defecto de
          fábrica se confirma, <strong>el costo del retorno lo asumimos
          nosotros</strong> y te despachamos el reemplazo sin costo adicional.
        </p>

        <h2>5. Condiciones generales</h2>
        <ul>
          <li>El producto debe entregarse completo: caja, accesorios y manuales.</li>
          <li>Conserva tu comprobante de pago o número de pedido — es tu garantía.</li>
          <li>Los productos en oferta tienen exactamente la misma garantía que los de precio regular.</li>
        </ul>

        <h2>Preguntas frecuentes</h2>
        {FAQ.map(({ q, a }) => (
          <div key={q}>
            <p><strong>{q}</strong></p>
            <p>{a}</p>
          </div>
        ))}

        <p>
          ¿Tienes un caso particular? Escríbenos por{' '}
          <a href={waHref} target="_blank" rel="noopener noreferrer">WhatsApp</a>{' '}
          o visita la sección{' '}
          <Link href="/nosotros">Quiénes somos</Link> para conocer la tienda.
          También puedes revisar nuestra{' '}
          <Link href="/shipping-policy">política de envíos</Link>.
        </p>
      </LegalPageLayout>
    </>
  );
}
