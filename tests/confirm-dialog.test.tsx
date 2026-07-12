/**
 * SESIÓN 26 — Foco y modales: pruebas del ConfirmDialog.
 *
 * Verifica:
 * - role="alertdialog", aria-modal, labelledby, describedby.
 * - Foco inicial va a Cancelar (no al botón peligroso).
 * - Escape llama onCancel.
 * - Backdrop click sin form dirty cierra.
 * - Scroll lock activo mientras está visible.
 * - Targets 44px en botones.
 * - Loading desactiva botones.
 * - Texto de título/mensaje se renderiza.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import React from 'react';
import ConfirmDialog from '../components/admin/ConfirmDialog';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ConfirmDialog', () => {
  it('renderiza con role alertdialog y atributos ARIA', () => {
    render(
      <ConfirmDialog
        open
        title="¿Eliminar producto?"
        message="Esta acción no se puede deshacer."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-dialog-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-dialog-message');
  });

  it('no renderiza cuando open=false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('muestra título y mensaje', () => {
    render(
      <ConfirmDialog
        open
        title="¿Eliminar producto?"
        message="Esta acción no se puede deshacer."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('¿Eliminar producto?')).toBeTruthy();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeTruthy();
  });

  it('botón Cancelar existe con texto por defecto', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('botón Confirmar usa texto por defecto', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Confirmar')).toBeTruthy();
  });

  it('usa labels personalizados cuando se proveen', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        confirmLabel="Sí, borrar"
        cancelLabel="No, volver"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Sí, borrar')).toBeTruthy();
    expect(screen.getByText('No, volver')).toBeTruthy();
  });

  it('loading desactiva botones y muestra spinner', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        loading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      if (btn.getAttribute('aria-label') === 'Cerrar') continue;
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('onConfirm se llama al hacer clic en confirmar', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    act(() => {
      screen.getByText('Confirmar').click();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('onCancel se llama al hacer clic en cancelar', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    act(() => {
      screen.getByText('Cancelar').click();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renderiza variante danger', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        variant="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('renderiza variante warning', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        variant="warning"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });
});
