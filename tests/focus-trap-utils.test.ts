/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  defaultIsVisible,
  jsdomFocusTrapVisibility,
  isFocusableElement,
} from '../lib/focus-trap-utils';

describe('focus-trap-utils', () => {
  it('jsdomFocusTrapVisibility acepta elementos conectados', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    expect(jsdomFocusTrapVisibility(btn)).toBe(true);
    btn.remove();
    expect(jsdomFocusTrapVisibility(btn)).toBe(false);
  });

  it('defaultIsVisible rechaza aria-hidden y hidden', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.setAttribute('aria-hidden', 'true');
    expect(defaultIsVisible(btn)).toBe(false);
    btn.removeAttribute('aria-hidden');
    btn.setAttribute('hidden', '');
    expect(defaultIsVisible(btn)).toBe(false);
    btn.remove();
  });

  it('isFocusableElement distingue botón habilitado de deshabilitado', () => {
    const enabled = document.createElement('button');
    const disabled = document.createElement('button');
    disabled.setAttribute('disabled', '');
    document.body.append(enabled, disabled);
    expect(isFocusableElement(enabled, jsdomFocusTrapVisibility)).toBe(true);
    expect(isFocusableElement(disabled, jsdomFocusTrapVisibility)).toBe(false);
    enabled.remove();
    disabled.remove();
  });
});
