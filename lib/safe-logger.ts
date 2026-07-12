import * as Sentry from '@sentry/nextjs';

// ── Tipos cerrados ────────────────────────────────────────────────────────

export type LogLevel = 'info' | 'warn' | 'error';

export type SafeLogContext = {
  requestId?: string;
  orderId?: string;
  route?: string;
  operation?: string;
  status?: number | string;
  count?: number;
  durationMs?: number;
  errorName?: string;
  provider?: 'r2' | 'resend' | 'upstash' | 'postgres' | 'nextauth';
};

type SafeError = { name: string; message: string };

// ── Patrones de sanitización ──────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]+/g;
const PG_URL_RE = /postgres(?:ql)?:\/\/[^@\s]+@[^\s]+/g;
const MYSQL_URL_RE = /mysql:\/\/[^@\s]+@[^\s]+/g;
const AMZ_QUERY_RE = /[?&]X-Amz-[A-Za-z0-9%-]+=[^&\s]+/g;
const SIGNED_URL_RE = /https?:\/\/[^\s]+\?[^\s]*(?:X-Amz-Signature|X-Amz-Credential|X-Amz-SignedHeaders|X-Amz-Expires)[^\s]*/g;
const SECRET_PATTERN_RE =
  /\b(cfat_|gh[pousr]_[A-Za-z0-9]+|re_[A-Za-z0-9]+|sk_live_|sk_test_|rk_live_|rk_test_|whsec_|ssec_|acct_)[A-Za-z0-9_-]+\b/g;
const LABELED_SECRET_RE =
  /\b(password|secret|token|accessKey|privateKey|apiKey|cf_secret|cf_token|signing_secret)\s*[=:]\s*['"]?[A-Za-z0-9_\-./+=%]+/gi;

const MAX_MESSAGE_LENGTH = 500;

/** Reemplaza PII/secrets en un string de texto plano. */
export function sanitizeText(value: string): string {
  let result = String(value);

  // Orden: patrones más específicos primero
  result = result.replace(SIGNED_URL_RE, '[REDACTED_SIGNED_URL]');
  result = result.replace(AMZ_QUERY_RE, ' [REDACTED_SIGNED_PARAM]');
  result = result.replace(PG_URL_RE, '[REDACTED_DATABASE_URL]');
  result = result.replace(MYSQL_URL_RE, '[REDACTED_DATABASE_URL]');
  result = result.replace(BEARER_RE, 'Bearer [REDACTED]');
  result = result.replace(SECRET_PATTERN_RE, '[REDACTED_SECRET]');
  result = result.replace(LABELED_SECRET_RE, '$1=[REDACTED_SECRET]');
  result = result.replace(EMAIL_RE, '[REDACTED_EMAIL]');

  return result.slice(0, MAX_MESSAGE_LENGTH);
}

// ── Normalización de errores ──────────────────────────────────────────────

export function normalizeError(error: unknown): SafeError {
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: sanitizeText(error.message) };
  }
  if (typeof error === 'string') {
    return { name: 'ExternalError', message: sanitizeText(error) };
  }
  return { name: 'UnknownError', message: 'Unknown error type (non-serializable)' };
}

// ── Entorno productivo ────────────────────────────────────────────────────

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function outputLine(level: LogLevel, event: string, context?: SafeLogContext, safeError?: SafeError): void {
  const line: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
  };
  if (context && Object.keys(context).length > 0) {
    line.context = context;
  }
  if (safeError) {
    line.error = safeError;
  }

  const jsonLine = JSON.stringify(line);

  if (isProduction()) {
    // Producción: una sola línea JSON
    switch (level) {
      case 'error':
        console.error(jsonLine);
        break;
      case 'warn':
        console.warn(jsonLine);
        break;
      default:
        console.log(jsonLine);
    }
  } else {
    // Desarrollo: legible pero sanitizado
    const ctxStr = context && Object.keys(context).length > 0
      ? ` ctx=${JSON.stringify(context)}`
      : '';
    const errStr = safeError ? ` err=${safeError.name}:${safeError.message}` : '';
    const msg = `[${event}]${ctxStr}${errStr}`;
    switch (level) {
      case 'error':
        console.error(msg);
        break;
      case 'warn':
        console.warn(msg);
        break;
      default:
        console.log(msg);
    }
  }
}

// ── API pública ───────────────────────────────────────────────────────────

export function logInfo(event: string, context?: SafeLogContext): void {
  outputLine('info', event, context);
}

export function logWarn(event: string, context?: SafeLogContext): void {
  outputLine('warn', event, context);
}

export function logError(event: string, error: unknown, context?: SafeLogContext): void {
  const safeError = normalizeError(error);

  // Enviar a Sentry solo en producción con DSN configurado
  if (isProduction() && process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: {
        event,
        ...(context?.provider ? { provider: context.provider } : {}),
        ...(context?.route ? { route: context.route } : {}),
      },
      extra: context
        ? { requestId: context.requestId, orderId: context.orderId, operation: context.operation }
        : undefined,
    });
  }

  outputLine('error', event, context, safeError);
}
