import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { PrimaryCta } from './components/PrimaryCta';
import { MundoTechShell } from './MundoTechShell';
import { emailSiteBaseUrl } from './site';
import { MT, fontSans } from './theme';

type Props = {
  customerName: string;
};

export function WelcomeEmail({ customerName }: Props) {
  const base = emailSiteBaseUrl().replace(/\/$/, '');
  const shopUrl = `${base}/productos`;

  const socialLinks: { label: string; url: string }[] = [];
  const ig = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
  const fb = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim();
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();
  if (ig) socialLinks.push({ label: 'Instagram', url: ig });
  if (fb) socialLinks.push({ label: 'Facebook', url: fb });
  if (wa) socialLinks.push({ label: 'WhatsApp', url: wa });

  return (
    <MundoTechShell
      preview="Bienvenido a MundoTech — tecnología premium en Barquisimeto."
      title="Bienvenido a MundoTech"
      heroCustomerName={customerName}
    >
      <Section style={{ padding: '12px 24px 8px', fontFamily: fontSans }}>
        <Text style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: MT.textPrimary }}>
          Bienvenido a MundoTech
        </Text>
        <Text style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: MT.textPrimary }}>
          Hola <strong>{customerName}</strong>,
        </Text>
        <Text style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.75, color: MT.textMuted }}>
          Gracias por registrarte. Somos tu tienda de tecnología en{' '}
          <strong style={{ color: MT.textPrimary }}>Barquisimeto</strong>: stock real, soporte cercano y
          pedidos con respaldo.
        </Text>
        <Text style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.75, color: MT.textMuted }}>
          Explora nuestro catálogo y compra con la tranquilidad de una marca local seria.
        </Text>
      </Section>

      <PrimaryCta href={shopUrl} label="Explorar tienda" />

      {socialLinks.length > 0 ? (
        <Section style={{ padding: '8px 24px 28px', textAlign: 'center', fontFamily: fontSans }}>
          <Text
            style={{
              margin: '0 0 8px',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: MT.textMuted,
            }}
          >
            Síguenos
          </Text>
          <Text style={{ margin: 0, fontSize: 13, lineHeight: 2 }}>
            {socialLinks.map((l) => (
              <React.Fragment key={l.label}>
                <Link
                  href={l.url}
                  style={{
                    color: MT.gold,
                    fontWeight: 600,
                    textDecoration: 'none',
                    margin: '0 8px',
                  }}
                >
                  {l.label}
                </Link>{' '}
              </React.Fragment>
            ))}
          </Text>
        </Section>
      ) : (
        <Section style={{ padding: '0 24px 28px', fontFamily: fontSans }} />
      )}
    </MundoTechShell>
  );
}
