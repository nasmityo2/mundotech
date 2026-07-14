/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import PaymentForm from '@/app/components/checkout/PaymentForm';
import type { StoreSettings } from '@/lib/data-store';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/motion', () => ({
  useReducedMotion: () => true,
  reducedTransition: {},
}));

vi.mock('@/lib/client-image-normalize', () => ({
  isHeicFile: () => false,
  normalizeImageForUpload: vi.fn(),
}));

const emptyPagoMovil: StoreSettings['pagoMovil'] = { bank: '', phone: '', idNumber: '' };
const emptyTransferencia: StoreSettings['transferencia'] = {
  bank: '',
  accountNumber: '',
  accountHolder: '',
  rif: '',
};
const fullPagoMovil: StoreSettings['pagoMovil'] = {
  bank: 'Banesco',
  phone: '0412-0000000',
  idNumber: 'V-12345678',
};
const fullTransferencia: StoreSettings['transferencia'] = {
  bank: 'Mercantil',
  accountNumber: '0105-0000-00-1234567890',
  accountHolder: 'MundoTech C.A.',
  rif: 'J-00000000-0',
};

function methodsGrid() {
  const heading = screen.getByRole('heading', { name: 'Método de pago' });
  const grid = heading.closest('div')?.nextElementSibling;
  if (!grid || !(grid as HTMLElement).className.includes('grid')) {
    throw new Error('Methods grid not found');
  }
  return grid as HTMLElement;
}

function methodCards() {
  return Array.from(methodsGrid().querySelectorAll('button'));
}

function methodLabels() {
  return methodCards().map((btn) => btn.querySelector('p.font-semibold')?.textContent?.trim() ?? '');
}

function renderPaymentForm(props: Partial<React.ComponentProps<typeof PaymentForm>> = {}) {
  return render(
    <PaymentForm
      embedded
      onPaymentSubmit={vi.fn()}
      pagoMovil={emptyPagoMovil}
      transferencia={emptyTransferencia}
      {...props}
    />,
  );
}

describe('PaymentForm — métodos visibles según modo y configuración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('Full con bancos vacíos: no muestra Pago Móvil ni Transferencia', () => {
    renderPaymentForm({
      whatsappMode: false,
      pagoMovilConfigured: false,
      transferenciaConfigured: false,
    });

    const labels = methodLabels();
    expect(labels).not.toContain('Pago Móvil');
    expect(labels).not.toContain('Transferencia');
    expect(labels).toContain('Cashea');
  });

  it('Full con solo Pago Móvil completo: muestra Pago Móvil y Cashea', () => {
    renderPaymentForm({
      whatsappMode: false,
      pagoMovil: fullPagoMovil,
      pagoMovilConfigured: true,
      transferenciaConfigured: false,
    });

    const labels = methodLabels();
    expect(labels).toContain('Pago Móvil');
    expect(labels).not.toContain('Transferencia');
    expect(labels).toContain('Cashea');
  });

  it('Full con solo Transferencia completa: muestra Transferencia y Cashea', () => {
    renderPaymentForm({
      whatsappMode: false,
      transferencia: fullTransferencia,
      pagoMovilConfigured: false,
      transferenciaConfigured: true,
    });

    const labels = methodLabels();
    expect(labels).not.toContain('Pago Móvil');
    expect(labels).toContain('Transferencia');
    expect(labels).toContain('Cashea');
  });

  it('WhatsApp con bancos vacíos: Pago Móvil y Transferencia visibles para coordinar', () => {
    renderPaymentForm({
      whatsappMode: true,
      pagoMovilConfigured: false,
      transferenciaConfigured: false,
    });

    const labels = methodLabels();
    expect(labels).toContain('Pago Móvil');
    expect(labels).toContain('Transferencia');
    expect(labels).toContain('Cashea');
  });

  it('WhatsApp con bancos vacíos: copy de coordinación sin datos bancarios de la tienda', () => {
    renderPaymentForm({
      whatsappMode: true,
      pagoMovilConfigured: false,
      transferenciaConfigured: false,
    });

    const pagoMovilCard = methodCards().find((btn) => btn.textContent?.includes('Pago Móvil'));
    expect(pagoMovilCard).toBeTruthy();
    fireEvent.click(pagoMovilCard!);

    expect(screen.getByText(/Coordinaremos los datos de pago contigo por WhatsApp/i)).toBeTruthy();
    expect(screen.queryByText(/Transfiere a estos datos de MundoTech/i)).toBeNull();
  });

  it('Full con Pago Móvil configurado: muestra datos bancarios al seleccionar el método', () => {
    renderPaymentForm({
      whatsappMode: false,
      pagoMovil: fullPagoMovil,
      pagoMovilConfigured: true,
      transferenciaConfigured: false,
    });

    const pagoMovilCard = methodCards().find((btn) => btn.textContent?.includes('Pago Móvil'));
    expect(pagoMovilCard).toBeTruthy();
    fireEvent.click(pagoMovilCard!);

    expect(screen.getByText(/Transfiere a estos datos de MundoTech/i)).toBeTruthy();
    expect(screen.getAllByText(fullPagoMovil.bank).length).toBeGreaterThan(0);
  });
});
