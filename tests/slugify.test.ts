import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slugify';

describe('slugify', () => {
  it('convierte nombres con tildes y ñ', () => {
    expect(slugify('Cámara de Seguridad Wifi')).toBe('camara-de-seguridad-wifi');
    expect(slugify('Pequeño Ventilador USB')).toBe('pequeno-ventilador-usb');
  });

  it('elimina símbolos y colapsa separadores', () => {
    expect(slugify('Consola R36s — Pro!! (2024)')).toBe('consola-r36s-pro-2024');
    expect(slugify('  doble  espacio _ guion ')).toBe('doble-espacio-guion');
  });

  it('devuelve cadena vacía si no quedan caracteres válidos', () => {
    expect(slugify('™©®')).toBe('');
  });
});
