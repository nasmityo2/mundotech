/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  estimatePaymentDiscountUsd,
  buildCheckoutPaymentMethods,
  DEFAULT_PAYMENT_METHODS,
  createCustomForeignCurrencyMethod,
  isDeletablePaymentMethod,
  isMethodConfigured,
} from '@/lib/payment-methods';
import { PaymentMethodsAdminSection } from '@/app/admin/settings/PaymentMethodsAdminSection';

describe('payment-method-ui', () => {
  it('estimación de ahorro no es autoritativa pero es determinista', () => {
    expect(estimatePaymentDiscountUsd(100, 10)).toBe(10);
    expect(estimatePaymentDiscountUsd(19.99, 7.5)).toBe(1.5);
  });

  it('DTO de checkout no incluye métodos inactivos', () => {
    const dto = buildCheckoutPaymentMethods(
      {
        pagoMovil: { bank: 'B', phone: '1', idNumber: 'V' },
        transferencia: { bank: 'B', accountNumber: '1', accountHolder: 'H', rif: 'J' },
        binancePayId: '123',
        paymentMethods: DEFAULT_PAYMENT_METHODS,
      },
      'whatsapp',
    );
    expect(dto.every((m) => typeof m.id === 'string')).toBe(true);
    expect(dto.find((m) => m.id === 'zelle')).toBeUndefined();
    for (const m of dto) {
      expect(m).toHaveProperty('discountPercent');
      expect(m).toHaveProperty('requireReferenceInFull');
      expect(m).not.toHaveProperty('sortOrder');
    }
  });

  it('badge copy format', () => {
    const pct = 10;
    const badge = `${pct}% de descuento pagando en divisas`;
    expect(badge).toContain('descuento pagando en divisas');
  });
});

describe('PaymentMethodsAdminSection UI', () => {
  beforeEach(() => {
    cleanup();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  const accountSettings = {
    pagoMovil: { bank: 'Banesco', phone: '0412', idNumber: 'V-1' },
    transferencia: {
      bank: 'M',
      accountNumber: '01051234567890123456',
      accountHolder: 'H',
      rif: 'J-1',
    },
    binancePayId: 'pay',
  };

  it('todos los métodos empiezan colapsados; abrir uno cierra el anterior', async () => {
    const methods = DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m }));
    const onChange = vi.fn();
    render(
      <PaymentMethodsAdminSection
        methods={methods}
        onChange={onChange}
        fieldError={() => undefined}
        accountSettings={accountSettings}
      />,
    );

    expect(screen.queryByText('Disponibilidad')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${methods[0]!.name}`) }));
    });
    expect(screen.getByText('Disponibilidad')).toBeTruthy();
    expect(screen.getByDisplayValue(methods[0]!.name)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${methods[1]!.name}`) }));
    });
    expect(screen.getByDisplayValue(methods[1]!.name)).toBeTruthy();
    expect(screen.queryByDisplayValue(methods[0]!.name)).toBeNull();
  });

  it('acordeones tienen aria-expanded / aria-controls', async () => {
    render(
      <PaymentMethodsAdminSection
        methods={DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m }))}
        onChange={vi.fn()}
        fieldError={() => undefined}
        accountSettings={accountSettings}
      />,
    );
    const nameBtn = screen.getByRole('button', {
      name: new RegExp(`^${DEFAULT_PAYMENT_METHODS[0]!.name}`),
    });
    expect(nameBtn.getAttribute('aria-expanded')).toBe('false');
    expect(nameBtn.getAttribute('aria-controls')).toBeTruthy();
    await act(async () => {
      fireEvent.click(nameBtn);
    });
    expect(nameBtn.getAttribute('aria-expanded')).toBe('true');
  });

  it('Full apagado oculta referencia/comprobante sin borrar valores', async () => {
    const methods = DEFAULT_PAYMENT_METHODS.map((m) =>
      m.id === 'binancepay'
        ? {
            ...m,
            enabledInFull: true,
            requireReferenceInFull: true,
            requireProofInFull: true,
          }
        : { ...m },
    );
    const onChange = vi.fn();

    const { rerender } = render(
      <PaymentMethodsAdminSection
        methods={methods}
        onChange={onChange}
        fieldError={() => undefined}
        accountSettings={accountSettings}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Binance Pay/ }));
    });
    expect(screen.getByText('Requiere referencia')).toBeTruthy();
    expect(screen.getByText('Requiere comprobante')).toBeTruthy();

    const fullToggle = screen.getByLabelText(/Disponible en checkout Full/i);
    await act(async () => {
      fireEvent.click(fullToggle);
    });
    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls.at(-1)?.[0];
    const binance = updated.find((m: { id: string }) => m.id === 'binancepay');
    expect(binance.enabledInFull).toBe(false);
    expect(binance.requireReferenceInFull).toBe(true);
    expect(binance.requireProofInFull).toBe(true);

    rerender(
      <PaymentMethodsAdminSection
        methods={updated}
        onChange={onChange}
        fieldError={() => undefined}
        accountSettings={accountSettings}
      />,
    );
    expect(screen.queryByText('Requiere referencia')).toBeNull();
    expect(screen.queryByText('Requiere comprobante')).toBeNull();
  });

  it('Cashea muestra que no recibe descuento por divisas', async () => {
    render(
      <PaymentMethodsAdminSection
        methods={DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m }))}
        onChange={vi.fn()}
        fieldError={() => undefined}
        accountSettings={accountSettings}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Cashea/ }));
    });
    expect(
      screen.getByText(/Cashea no recibe descuento por pago en divisas/i),
    ).toBeTruthy();
  });

  it('método personalizado se añade y abre; solo personalizados pueden eliminarse', async () => {
    let methods = DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m }));
    const onChange = vi.fn((next) => {
      methods = next;
    });
    const { rerender } = render(
      <PaymentMethodsAdminSection
        methods={methods}
        onChange={onChange}
        fieldError={() => undefined}
        accountSettings={accountSettings}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Agregar método en divisas/i }));
    });
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)?.[0];
    const custom = next.find((m: { kind: string }) => m.kind === 'CUSTOM_FOREIGN_CURRENCY');
    expect(custom).toBeTruthy();
    expect(isDeletablePaymentMethod(custom)).toBe(true);

    rerender(
      <PaymentMethodsAdminSection
        methods={next}
        onChange={onChange}
        fieldError={() => undefined}
        accountSettings={accountSettings}
      />,
    );
    expect(screen.getByText('Eliminar método personalizado')).toBeTruthy();
    expect(screen.getByDisplayValue(custom.name)).toBeTruthy();

    for (const m of DEFAULT_PAYMENT_METHODS) {
      expect(isDeletablePaymentMethod(m)).toBe(false);
    }
  });

  it('chips de canal y Configurado visibles en encabezado cerrado', () => {
    render(
      <PaymentMethodsAdminSection
        methods={DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m }))}
        onChange={vi.fn()}
        fieldError={() => undefined}
        accountSettings={accountSettings}
      />,
    );
    const pago = screen.getByRole('button', { name: /Pago Móvil/i });
    expect(within(pago).getByText('Activo')).toBeTruthy();
    expect(within(pago).getByText('WhatsApp')).toBeTruthy();
    expect(within(pago).getByText('Full')).toBeTruthy();
    expect(within(pago).getByText('Configurado')).toBeTruthy();
  });
});

describe('isMethodConfigured helpers', () => {
  it('Pago Móvil requiere tres campos; Transferencia cuatro; Binance Pay ID', () => {
    const base = {
      pagoMovil: { bank: '', phone: '', idNumber: '' },
      transferencia: { bank: '', accountNumber: '', accountHolder: '', rif: '' },
      binancePayId: '',
    };
    const pm = DEFAULT_PAYMENT_METHODS.find((m) => m.kind === 'PAGO_MOVIL')!;
    const tr = DEFAULT_PAYMENT_METHODS.find((m) => m.kind === 'BANK_TRANSFER')!;
    const bn = DEFAULT_PAYMENT_METHODS.find((m) => m.kind === 'BINANCE')!;

    expect(isMethodConfigured(pm, base)).toBe(false);
    expect(
      isMethodConfigured(pm, {
        ...base,
        pagoMovil: { bank: 'B', phone: '1', idNumber: 'V' },
      }),
    ).toBe(true);

    expect(isMethodConfigured(tr, base)).toBe(false);
    expect(
      isMethodConfigured(tr, {
        ...base,
        transferencia: {
          bank: 'B',
          accountNumber: '1',
          accountHolder: 'H',
          rif: 'J',
        },
      }),
    ).toBe(true);

    expect(isMethodConfigured(bn, base)).toBe(false);
    expect(isMethodConfigured(bn, { ...base, binancePayId: 'x' })).toBe(true);
    // QR no es requisito
    expect(
      isMethodConfigured(bn, { ...base, binancePayId: 'x', paymentMethods: [] }),
    ).toBe(true);
  });

  it('createCustomForeignCurrencyMethod genera método eliminable', () => {
    const custom = createCustomForeignCurrencyMethod(DEFAULT_PAYMENT_METHODS);
    expect(custom.kind).toBe('CUSTOM_FOREIGN_CURRENCY');
    expect(isDeletablePaymentMethod(custom)).toBe(true);
  });
});
