/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddProductModal from '@/app/components/AddProductModal';

vi.mock('@/app/actions/productActions', () => ({
  createProductAction: vi.fn(),
  updateProductAction: vi.fn(),
}));

vi.mock('@/app/actions/configActions', () => ({
  getPricingParams: vi.fn(async () => ({ marginPct: 50, factor: 1 })),
  getMarginPresets: vi.fn(async () => [30, 50, 80, 100]),
  updateMarginPresets: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => {},
}));

vi.mock('@/hooks/useBodyScrollLock', () => ({
  useBodyScrollLock: () => {},
}));

import { createProductAction, updateProductAction } from '@/app/actions/productActions';

const createProductActionMock = vi.mocked(createProductAction);
const updateProductActionMock = vi.mocked(updateProductAction);

const existingCategories = ['Accesorios', 'Audio'];

function fillRequiredFields(container: HTMLElement) {
  const name = container.querySelector('#name') as HTMLInputElement;
  const description = container.querySelector('#description') as HTMLTextAreaElement;
  const stock = container.querySelector('#stock') as HTMLInputElement;
  fireEvent.change(name, { target: { value: 'Producto test' } });
  fireEvent.change(description, { target: { value: 'Descripción de prueba' } });
  fireEvent.change(stock, { target: { value: '1' } });
}

describe('AddProductModal — categoría', () => {
  beforeEach(() => {
    createProductActionMock.mockReset();
    updateProductActionMock.mockReset();
    createProductActionMock.mockResolvedValue({
      success: true,
      message: 'ok',
      category: { name: 'Cuidado personal', created: true },
    });
    updateProductActionMock.mockResolvedValue({
      success: true,
      message: 'ok',
      category: { name: 'Accesorios', created: false },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra categorías existentes en el datalist', () => {
    render(
      <AddProductModal
        isOpen
        onClose={vi.fn()}
        product={null}
        categories={existingCategories}
      />,
    );
    const options = Array.from(
      document.querySelectorAll('#category-options option'),
    ).map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(expect.arrayContaining(['Accesorios', 'Audio']));
  });

  it('permite escribir una nueva y muestra Se creará la categoría', () => {
    render(
      <AddProductModal
        isOpen
        onClose={vi.fn()}
        product={null}
        categories={existingCategories}
      />,
    );
    const input = screen.getByLabelText(/Categoría/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Cuidado personal' } });
    expect(screen.getByTestId('category-will-create').textContent).toContain(
      'Se creará la categoría: Cuidado personal',
    );
    expect(createProductActionMock).not.toHaveBeenCalled();
  });

  it('no crea nada antes del submit', () => {
    render(
      <AddProductModal
        isOpen
        onClose={vi.fn()}
        product={null}
        categories={existingCategories}
      />,
    );
    const input = screen.getByLabelText(/Categoría/i);
    fireEvent.change(input, { target: { value: 'Nueva cat' } });
    fireEvent.blur(input);
    expect(createProductActionMock).not.toHaveBeenCalled();
    expect(updateProductActionMock).not.toHaveBeenCalled();
  });

  it('al guardar llama onSaved y cierra', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn(async () => {});
    const { container } = render(
      <AddProductModal
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        product={null}
        categories={existingCategories}
      />,
    );

    fillRequiredFields(container);
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: 'Cuidado personal' },
    });
    // Costo + margen mínimos para pasar validación del formulario HTML
    const cost = container.querySelector('#cost') as HTMLInputElement;
    const margin = container.querySelector('#marginPct') as HTMLInputElement;
    const price = container.querySelector('#price') as HTMLInputElement | null;
    if (cost) fireEvent.change(cost, { target: { value: '10' } });
    if (margin) fireEvent.change(margin, { target: { value: '50' } });
    if (price) fireEvent.change(price, { target: { value: '20' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createProductActionMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('al abrir producto nuevo la categoría está vacía', () => {
    const { rerender } = render(
      <AddProductModal
        isOpen
        onClose={vi.fn()}
        product={{
          id: 'p1',
          name: 'Editado',
          category: 'Accesorios',
          price: 10,
          stock: 1,
          images: [],
          brand: 'Marca',
          description: 'Desc',
        }}
        categories={existingCategories}
      />,
    );
    expect((screen.getByLabelText(/Categoría/i) as HTMLInputElement).value).toBe('Accesorios');

    rerender(
      <AddProductModal
        isOpen
        onClose={vi.fn()}
        product={null}
        categories={existingCategories}
      />,
    );
    expect((screen.getByLabelText(/Categoría/i) as HTMLInputElement).value).toBe('');
  });

  it('al editar conserva la categoría actual aunque no esté en la lista', () => {
    render(
      <AddProductModal
        isOpen
        onClose={vi.fn()}
        product={{
          id: 'p1',
          name: 'Editado',
          category: 'Huérfana Legacy',
          price: 10,
          stock: 1,
          images: [],
          brand: 'Marca',
          description: 'Desc',
        }}
        categories={existingCategories}
      />,
    );
    const input = screen.getByLabelText(/Categoría/i) as HTMLInputElement;
    expect(input.value).toBe('Huérfana Legacy');
    const options = Array.from(
      document.querySelectorAll('#category-options option'),
    ).map((o) => (o as HTMLOptionElement).value);
    expect(options).toContain('Huérfana Legacy');
  });
});
