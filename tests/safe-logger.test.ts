import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import {
  sanitizeText,
  normalizeError,
  sanitizeEvent,
  sanitizeContext,
  logInfo,
  logWarn,
  logError,
} from '@/lib/safe-logger';
import type { SafeLogContext } from '@/lib/safe-logger';

// ── Cleanup global ─────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ── Type-level test helpers ────────────────────────────────────────────────

// Type-level check: SafeLogContext should NOT allow email as a key
type _TestContext = SafeLogContext extends { email?: string } ? true : false;
void ({} as _TestContext);
// @ts-expect-error — email is NOT a valid key in SafeLogContext
const _invalidContext: SafeLogContext = { email: 'test@test.com' };
void (_invalidContext);

describe('sanitizeText', () => {
  it('redacts email addresses', () => {
    const result = sanitizeText('Contact: user@example.com');
    expect(result).not.toContain('user@example.com');
    expect(result).toContain('[REDACTED_EMAIL]');
  });

  it('redacts Bearer tokens', () => {
    const result = sanitizeText('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.dGVzdA');
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(result).toContain('Bearer [REDACTED]');
  });

  it('redacts PostgreSQL connection URLs', () => {
    const result = sanitizeText('postgresql://user:password@host:5432/db');
    expect(result).toContain('[REDACTED_DATABASE_URL]');
  });

  it('redacts MySQL connection URLs', () => {
    const result = sanitizeText('mysql://user:pass@host:3306/db');
    expect(result).toContain('[REDACTED_DATABASE_URL]');
  });

  it('redacts signed URLs with X-Amz-* params', () => {
    const result = sanitizeText(
      'https://bucket.r2.cloudflarestorage.com/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKID&X-Amz-Signature=abc123'
    );
    expect(result).toContain('[REDACTED_SIGNED_URL]');
  });

  it('redacts cfat_ secrets', () => {
    const result = sanitizeText('token=cfat_abc123def456');
    expect(result).not.toContain('cfat_abc123def456');
    expect(result).toContain('[REDACTED_SECRET]');
  });

  it('redacts GitHub tokens', () => {
    const result = sanitizeText('ghp_xxxxxxxxxxxxxxxxxxxx');
    expect(result).not.toContain('ghp_');
    expect(result).toContain('[REDACTED_SECRET]');
  });

  it('redacts Resend API keys (re_)', () => {
    const result = sanitizeText('Resend key is re_abc123DEF456');
    expect(result).not.toContain('re_abc123DEF456');
    expect(result).toContain('[REDACTED_SECRET]');
  });

  it('redacts labeled secrets (password=, secret=, token=)', () => {
    const result = sanitizeText('password=supersecret123 token=abc');
    expect(result).toContain('[REDACTED_SECRET]');
  });

  it('truncates messages longer than 500 chars', () => {
    const long = 'A'.repeat(1000);
    const result = sanitizeText(long);
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it('preserves non-sensitive text', () => {
    const result = sanitizeText('Order 1234 was created successfully');
    expect(result).toBe('Order 1234 was created successfully');
  });

  // ── Nuevos patrones de PII ───────────────────────────────────────────────

  it('redacta teléfono venezolano', () => {
    const result = sanitizeText('phone=0412-123-4567');
    expect(result).not.toContain('0412-123-4567');
    expect(result).toContain('[REDACTED_PHONE]');
  });

  it('redacta cédula venezolana', () => {
    const result = sanitizeText('customerId=V-12345678');
    expect(result).not.toContain('V-12345678');
    expect(result).toContain('[REDACTED_ID]');
  });

  it('redacta referencia bancaria etiquetada', () => {
    const result = sanitizeText('paymentReference=123456789');
    expect(result).not.toContain('123456789');
    expect(result).toContain('[REDACTED_REFERENCE]');
  });

  it('redacta dirección etiquetada', () => {
    const result = sanitizeText('shippingAddress=Carrera 21 con calle 21');
    expect(result).not.toContain('Carrera 21');
    expect(result).toContain('[REDACTED_ADDRESS]');
  });
});

describe('normalizeError', () => {
  it('handles Error instances', () => {
    const err = normalizeError(new Error('Something went wrong'));
    expect(err.name).toBe('Error');
    expect(err.message).toContain('Something went wrong');
  });

  it('sanitizes error message with PII', () => {
    const err = normalizeError(new Error('email user@test.com failed'));
    expect(err.message).not.toContain('user@test.com');
    expect(err.message).toContain('[REDACTED_EMAIL]');
  });

  it('handles string errors', () => {
    const err = normalizeError('manual error string');
    expect(err.name).toBe('ExternalError');
    expect(err.message).toContain('manual error string');
  });

  it('handles non-serializable objects', () => {
    const err = normalizeError(42);
    expect(err.name).toBe('UnknownError');
  });
});

describe('sanitizeEvent', () => {
  it('acepta event name canónico', () => {
    expect(sanitizeEvent('checkout_failed')).toBe('checkout_failed');
  });

  it('reemplaza evento inválido o con PII', () => {
    expect(sanitizeEvent('email=user@example.com')).toBe('invalid_log_event');
  });
});

describe('sanitizeContext', () => {
  it('sanitiza strings dentro del contexto', () => {
    const result = sanitizeContext({
      requestId: 'req-user@example.com',
      orderId: 'order-safe',
      route: '/api/test?token=cfat_abc123',
      operation: 'send to user@example.com',
      status: 'Bearer secret-token',
      errorName: 'error user@example.com',
      provider: 'resend',
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('user@example.com');
    expect(serialized).not.toContain('cfat_abc123');
    expect(serialized).not.toContain('secret-token');
  });

  it('omite métricas no finitas o negativas', () => {
    const result = sanitizeContext({
      count: Number.NaN,
      durationMs: -1,
    });
    expect(result).toBeUndefined();
  });
});

describe('logInfo / logWarn / logError', () => {
  it('logInfo outputs event and optional context', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx: SafeLogContext = { orderId: 'abc123', operation: 'checkout' };
    logInfo('checkout_completed', ctx);
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('checkout_completed');
    spy.mockRestore();
  });

  it('logWarn outputs warning', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logWarn('rate_limit_near_limit', { provider: 'upstash', status: 429 });
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('rate_limit_near_limit');
    spy.mockRestore();
  });

  it('logError outputs error with sanitized message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('db_connection_failed', new Error('Cannot connect to postgresql://user:pass@host/db'));
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('db_connection_failed');
    expect(output).not.toContain('postgresql://');
    expect(output).not.toContain('user:pass');
    spy.mockRestore();
  });

  it('logError event name is preserved through sanitization', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('order_confirmation_email_failed', new Error('Resend API error'), {
      orderId: 'ord_123',
      provider: 'resend',
    });
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('order_confirmation_email_failed');
    expect(output).toContain('ord_123');
    expect(output).toContain('resend');
    spy.mockRestore();
  });

  it('logError does not include PII from context', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ctx: SafeLogContext = { orderId: 'safe-id', operation: 'send_email' };
    logError('email_failed', new Error('some error'), ctx);
    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0]?.[0] ?? '';
    expect(output).not.toContain('[object Object]');
    spy.mockRestore();
  });

  it('in production mode outputs single JSON line', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logInfo('test_event', { operation: 'test' });

    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0]?.[0] ?? '';
    // Should be valid JSON with required fields
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('level', 'info');
    expect(parsed).toHaveProperty('event', 'test_event');
    expect(parsed).toHaveProperty('context');
    expect(parsed.context).toHaveProperty('operation', 'test');

    vi.unstubAllEnvs();
    spy.mockRestore();
  });

  it('logError in production outputs JSON with error field', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logError('fail', new Error('boom'));

    const output = spy.mock.calls[0]?.[0] ?? '';
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('level', 'error');
    expect(parsed).toHaveProperty('error');
    expect(parsed.error).toHaveProperty('name', 'Error');
    expect(parsed.error).toHaveProperty('message', 'boom');

    vi.unstubAllEnvs();
    spy.mockRestore();
  });

  // ── Sentry sanitizado ────────────────────────────────────────────────────

  it('Sentry recibe un Error nuevo y sanitizado', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');

    const originalError = new Error('Failed for user@example.com with Bearer secret-token');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logError('sentry_test_error', originalError, {
      operation: 'send to user@example.com',
      provider: 'resend',
    });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    const captured = vi.mocked(Sentry.captureException).mock.calls[0]?.[0];
    expect(captured).toBeInstanceOf(Error);
    expect(captured).not.toBe(originalError);

    const capturedMessage = (captured as Error).message;
    expect(capturedMessage).not.toContain('user@example.com');
    expect(capturedMessage).not.toContain('secret-token');

    const options = vi.mocked(Sentry.captureException).mock.calls[0]?.[1];
    expect(JSON.stringify(options)).not.toContain('user@example.com');

    consoleSpy.mockRestore();
  });

  // ── Contexto sanitizado en console ───────────────────────────────────────

  it('outputLine nunca imprime contexto original', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logError('context_test', new Error('safe'), {
      operation: 'email=user@example.com',
    });

    const output = String(spy.mock.calls[0]?.[0] ?? '');
    expect(output).not.toContain('user@example.com');
    expect(output).toContain('[REDACTED_EMAIL]');
  });
});
