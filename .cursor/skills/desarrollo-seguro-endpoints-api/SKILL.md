---
name: desarrollo-seguro-endpoints-api
description: >-
  Define y revisa Route Handlers REST en Next.js App Router con Prisma:
  filtro active/isActive/published en GET públicos, logging en catch, rate
  limiting, validación Zod, mitigación de inyección/enumeración y headers de
  seguridad. Aplicar cuando el usuario pida crear o modificar un Route Handler
  en app/api/ o revise seguridad de endpoints API del proyecto.
---

# Desarrollo Seguro de Endpoints API (Prisma GET/POST)

Eres un arquitecto de API REST para Next.js App Router. Sigue este protocolo EXACTO para cada Route Handler que crees o modifiques en este proyecto:

PASO 1 — FILTRO ACTIVO EXPLÍCITO (nunca query vacío {})
- En todo GET público de entidades con campo active/isActive/published: incluir SIEMPRE { where: { active: true } }
- NO confíes en parámetros del cliente para este filtro. El filtro va hardcoded en el servidor.
- CORRECTO: prisma.promotion.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } })
- PROHIBIDO: prisma.promotion.findMany() sin filtro — expone registros inactivos.

PASO 2 — LOGGING SISTEMÁTICO (cero catch mudos)
- PROHIBIDO: catch { return NextResponse.json({ error: 'error' }, { status: 500 }) } sin logging.
- OBLIGATORIO en catch(error): console.error('[/api/ruta][METODO] Descripción del error:', error)
- Incluir siempre en el log: ruta, método HTTP, tipo de operation y el error completo.

PASO 3 — RATE LIMITING (obligatorio en escritura, aplicar en lectura pública)
- TODO método POST/PUT/PATCH/DELETE: aplicar rateLimit antes de cualquier lógica de negocio.
- Imports: import { rateLimit } from '@/lib/rate-limit'; import { getClientIp } from '@/lib/utils'
- Patrón: const ip = getClientIp(request); const limited = await rateLimit(`endpoint:${ip}`, 20, 60)
- Si limited.limited === true: return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
- GET públicos de alta frecuencia (eventos, analytics): rateLimit con límite generoso (100/min por IP).

PASO 4 — VALIDACIÓN DE ENTRADA CON ZOD (en todo POST/PUT/PATCH)
- Definir schema Zod ANTES de escribir el handler. Nunca parsear body manualmente.
- const parsed = schema.safeParse(await request.json())
- Si !parsed.success: return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
- Nunca usar los datos del body sin haber validado primero con Zod.

PASO 5 — PROTECCIÓN CONTRA INYECCIÓN Y ENUMERACIÓN
- Nunca exponer stacks de error o mensajes internos de BD al cliente en producción.
- En endpoints con IDs: validar formato UUID/CUID antes del query. Rechazar con 400 si inválido.
- Para endpoints admin: requireAdmin() como PRIMERA línea, antes de parsear body.
- Respuestas de error: no revelar si un recurso no existe vs no autorizado. Usar 403 genérico.

PASO 6 — HEADERS DE SEGURIDAD EN RESPUESTAS
- Datos sensibles: agregar 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
- Lectura pública cacheable: Cache-Control: public, max-age=60, stale-while-revalidate=300
- Nunca incluir información de versión o stack en headers de respuesta.

PASO 7 — TEMPLATE OBLIGATORIO PARA NUEVOS ROUTE HANDLERS
Usa siempre este esqueleto como punto de partida:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/utils'
// import { requireAdmin } from '@/lib/api-auth'  ← decomenta si es ruta admin
import prisma from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ /* campos aquí */ })

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limited = await rateLimit(`ruta-nombre:${ip}`, 20, 60)
    if (limited.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    // const authCheck = await requireAdmin()
    // if (authCheck instanceof Response) return authCheck
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    // ... lógica de negocio
  } catch (error) {
    console.error('[/api/ruta][POST] Error inesperado:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```
