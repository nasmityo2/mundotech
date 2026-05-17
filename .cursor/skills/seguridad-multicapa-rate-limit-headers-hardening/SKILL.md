---
name: seguridad-multicapa-rate-limit-headers-hardening
description: >-
  Blindaje multilayer en Next.js (mundotech-ecommerce): rate limit en escritura
  pública, getClientIp, CSRF en Route Handlers, sanitización y Prisma raw seguro,
  headers globales en middleware, gap Redis multi-instancia, validación de env al
  arranque, anti-enumeración en auth, uploads con magic bytes y Cloudinary.
  Activar cuando el usuario crea endpoints públicos, agrega analytics, trabaja
  con uploads o toca configuración de seguridad.
---

# Seguridad Multicapa — Rate Limit, Headers y Hardening

Eres un especialista en seguridad ofensiva y defensiva para aplicaciones Next.js en producción. Sigue este protocolo EXACTO para blindar mundotech-ecommerce contra vectores de ataque conocidos:

PASO 1 — RATE LIMIT EN ENDPOINTS PÚBLICOS DE ESCRITURA
- Para CUALQUIER endpoint que acepte escritura sin autenticación: aplicar rate limit como PRIMERA operación.
- app/api/events/view: aplicar rateLimit(`events:view:${ip}`, 30, 60) — máximo 30 escrituras/minuto/IP.
- Patrón: const ip = getClientIp(request); si !ip retornar 400; si limited retornar 429.
- Para IPs detrás de CDN: confiar SOLO en el primer valor de x-forwarded-for (proxy de confianza configurado).

PASO 2 — getClientIp ROBUSTO
- Verificar que getClientIp en lib/utils.ts maneja en orden: x-forwarded-for (primer valor), x-real-ip, remoteAddress.
- Si la IP no se puede determinar: retornar 'unknown' y aplicar rate limit con clave 'unknown' (más restrictivo).
- PROHIBIDO: usar request.ip directamente sin validación — puede ser undefined en Vercel Edge Runtime.
- Para eventos de analytics: loguear IP hasheada (SHA-256) para auditoría sin almacenar IP real en texto plano.

PASO 3 — PROTECCIÓN CSRF PARA MUTATIONS
- Next.js App Router con Server Actions tiene protección CSRF built-in via cookies SameSite.
- Para Route Handlers POST que reciben datos de formulario: verificar Origin header contra process.env.NEXTAUTH_URL.
- Si la solicitud viene de origen diferente al dominio configurado: rechazar con 403 Forbidden.
- Patrón: const origin = request.headers.get('origin'); if (origin && origin !== process.env.NEXTAUTH_URL) return 403

PASO 4 — SANITIZACIÓN DE INPUTS: PREVENIR INYECCIÓN
- Prisma usa queries parametrizados por defecto: NUNCA usar prisma.$queryRawUnsafe con input del usuario.
- Si se necesita $queryRaw: usar template literals parametrizados: prisma.$queryRaw`SELECT * WHERE id = ${id}`
- En campos de búsqueda libre (search/query): sanitizar caracteres especiales antes de Prisma contains.
- Patrón para search: const safe = query.replace(/[%_\\]/g, char => `\\${char}`) antes de { contains: safe }

PASO 5 — HEADERS DE SEGURIDAD GLOBAL EN MIDDLEWARE
- En middleware.ts: agregar headers de seguridad para TODAS las rutas, no solo /admin.
- Agregar: 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
- Agregar: 'X-Frame-Options': 'DENY'
- Agregar: 'X-Content-Type-Options': 'nosniff'
- Agregar: 'Referrer-Policy': 'strict-origin-when-cross-origin'
- Agregar: 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'

PASO 6 — LIMITACIÓN MULTI-INSTANCIA: DOCUMENTAR GAP DE REDIS
- lib/rate-limit.ts usa Map en memoria: en deployment multi-instancia los límites NO son globales.
- Agregar comentario en lib/rate-limit.ts: // TODO: migrar a Upstash Redis para rate limit global en producción multi-instancia
- Compensar mientras tanto: configurar límites más conservadores (dividir entre instancias esperadas).
- Path de migración documentado: @upstash/ratelimit con Sliding Window algorithm.

PASO 7 — VARIABLES DE ENTORNO: VALIDACIÓN AL STARTUP
- Crear o actualizar lib/env-validation.ts con validación de variables críticas.
- Variables requeridas mínimas: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, RESEND_API_KEY, RESEND_FROM_ADDRESS
- Patrón: const required = ['DATABASE_URL', 'NEXTAUTH_SECRET']; required.forEach(k => { if (!process.env[k]) throw new Error(`Missing env var: ${k}`) })
- Importar lib/env-validation.ts en lib/prisma.ts para que se valide al inicio del servidor.
- Agregar TODAS las variables al .env.example con descripción de formato esperado (sin valores reales).

PASO 8 — ANTI-ENUMERACIÓN DE USUARIOS
- En endpoints de auth (reset password, registro): retornar SIEMPRE el mismo mensaje sin importar si el email existe.
- Verificar que app/actions/authActions.ts implementa este patrón correctamente.
- Tiempo de respuesta consistente: si la cuenta no existe, añadir delay artificial para evitar timing attacks.
- En login: el mensaje de error NO debe distinguir entre 'usuario no existe' y 'contraseña incorrecta'.

PASO 9 — UPLOAD SEGURO: VALIDACIÓN DEFENSIVA DE ARCHIVOS
- En app/api/upload y app/api/checkout/upload-proof: verificar magic bytes del archivo, no solo extensión MIME.
- Lista blanca de tipos permitidos: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
- Tamaño máximo: validar antes de leer el buffer completo. Rechazar con 413 si supera el límite configurado.
- Nombre de archivo: sanitizar con path.basename() y reemplazar por UUID antes de subir a Cloudinary.
- PROHIBIDO: almacenar archivos en el filesystem del servidor. Siempre Cloudinary como destino final.
- Escanear el content-type real del buffer con file-type o similar, no confiar en el header del cliente.
