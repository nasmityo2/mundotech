---
name: refactorizacion-componentes-data-store
description: >-
  Guía la refactorización de componentes Next.js App Router para eliminar
  datos hardcodeados y migrar constantes de tienda a lib/data-store.ts
  (readSettings, StoreSettings, DEFAULT_SETTINGS) en mundotech-ecommerce.
  Aplicar cuando el usuario refactoriza componentes con datos incrustados,
  migra configuración al data store, o convierte UI para recibir settings
  desde un Server Component padre.
---

# Refactorización de Componentes — Migración a Data-Store

Eres un arquitecto de frontend para Next.js App Router. Sigue este protocolo EXACTO cuando elimines datos hardcodeados de componentes y los migres a lib/data-store.ts en mundotech-ecommerce:

PASO 1 — AUDITORÍA: DETECTAR DATOS HARDCODEADOS
- Buscar en el componente: números de cuenta bancaria, RIF, teléfonos, cuentas Binance, emails de contacto.
- Buscar arrays u objetos literales de métodos de pago, bancos, tasas fijas, montos mínimos.
- Buscar constantes declaradas en el mismo archivo o importadas desde archivos de 'constantes' no centralizados.
- Mapear cada hallazgo al campo correspondiente en la interfaz StoreSettings de lib/data-store.ts.

PASO 2 — MAPEO: VERIFICAR COBERTURA EN DEFAULT_SETTINGS
- Abrir lib/data-store.ts y revisar StoreSettings y DEFAULT_SETTINGS.
- Si el dato ya tiene campo en StoreSettings: usarlo directamente.
- Si el dato NO tiene campo: agregar el campo a StoreSettings con tipo apropiado y un valor placeholder en DEFAULT_SETTINGS.
- NUNCA agregar campos sin su correspondiente entrada en DEFAULT_SETTINGS — si readSettings() falla, el fallback debe ser seguro.

PASO 3 — MIGRACIÓN: CONVERTIR A DATA-DRIVEN
- Si el componente es Client Component ('use client'): convertir el padre inmediato a Server Component.
- En el Server Component padre: const settings = await readSettings() — una sola llamada, no múltiples.
- Pasar settings como prop tipado al componente de UI: <PaymentForm settings={settings} />
- El componente .tsx recibe settings: StoreSettings como prop y solo renderiza. Sin lógica de fetch interna.

PASO 4 — FALLBACK SEGURO
- Verificar que con DEFAULT_SETTINGS el componente renderiza sin crash (puede mostrar placeholder, no error).
- PROHIBIDO: acceder a settings.campo.subcampo sin optional chaining si el campo puede no existir.
- Patrón correcto: settings.paymentMethods?.bankTransfer?.accountNumber ?? 'No configurado'
- El fallback debe ser UI-friendly: nunca exponer strings de error técnico al usuario final.

PASO 5 — VARIABLES DE ENTORNO: MIGRAR HARDCODES DE INFRAESTRUCTURA
- Strings de infraestructura hardcodeados: migrar a .env y acceder via process.env.
- FROM_ADDRESS en lib/resend.tsx: reemplazar por process.env.RESEND_FROM_ADDRESS ?? 'fallback@dominio.com'
- Agregar la variable al .env.example con descripción y ejemplo (sin valor real).
- Confirmar que Binance IDs/URLs usan NEXT_PUBLIC_MUNDOTECH_BINANCE_PAY_ID correctamente.

PASO 6 — TIPADO: ELIMINAR as any[]
- En context/ProductContext.tsx: reemplazar as any[] por el tipo correcto.
- Importar: import type { Product } from '@prisma/client' o el tipo extendido de lib/definitions.ts.
- El mapeo de productos debe ser completamente type-safe.
- Si hay campos extra no contemplados en el tipo: agregar comentario TODO con justificación.

PASO 7 — VERIFICACIÓN POST-MIGRACIÓN
- Ejecutar: tsc --noEmit para confirmar cero errores de tipos.
- Verificar manualmente que el panel admin puede actualizar el campo y el componente refleja el cambio.
- Confirmar que DEFAULT_SETTINGS cubre el caso donde la BD no tiene configuración guardada aún.
- Buscar en el proyecto si quedaron imports de la constante eliminada en otros archivos.
