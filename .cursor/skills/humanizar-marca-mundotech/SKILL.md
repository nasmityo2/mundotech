---
name: humanizar-marca-mundotech
description: Guía de identidad de marca real para MundoTech Barquisimeto. Aplica cuando el usuario pida reducir el aspecto "hecho por IA", mejorar el diseño visual, editar copy o textos de UI, modificar el hero, footer, trust badges, auth pages, not-found, about, o cualquier componente de presentación del sitio. Provee los datos reales de la tienda física, el slogan oficial, el tono de voz correcto y la lista de cambios priorizados.
---

# Humanizar MundoTech — Identidad de marca real

Lee `docs/BRIEF-HUMANIZAR-MUNDOTECH.md` para el análisis completo. Este archivo contiene los atajos de ejecución.

---

## Datos reales de la tienda (usar siempre, nunca placeholder)

```
Slogan oficial:  CONECTADOS CONTIGO
Teléfono 1:      0412-1471338
Teléfono 2:      0414-5709470
Instagram:       @Mundotech39
Dirección:       Calle 22 entre carreras 18 y 19, CC Minicentro 34
Ciudad:          Barquisimeto, estado Lara
```

---

## Reglas de identidad visual

**NO cambiar:**
- Paleta `#0B1220` (navy) + `#FFD700` (amarillo) — es la tienda física real
- Circuit traces en hero y elementos decorativos del logo — el logo real tiene circuitos integrados, no es cliché IA
- Precios duales USD/Bs y métodos de pago venezolanos

**SÍ cambiar:**
- Cualquier trust badge, CTA o copy que suene a template genérico traducido del inglés
- Footer que liste Cashea/Efectivo cuando el checkout solo acepta Pago Móvil, Transferencia y Binance

---

## Tono de voz venezolano

| Evitar (suena IA) | Usar (suena humano/local) |
|-------------------|--------------------------|
| "Agregar al carrito" | "¡Me lo llevo!" |
| "Ver más productos" | "Explorar todo el catálogo" |
| "Soporte 24/7" | "WhatsApp directo con el equipo" |
| "Oferta especial" | "Tremendo precio" / "Lo más pedido" |
| "Garantía oficial" | "12 meses de garantía directa" |
| "Envío seguro" | "Delivery en Barquisimeto en 24h" |
| "Productos relacionados" | "También te puede interesar" |
| "Pago 100% seguro" | "Pago Móvil · Transferencia · Binance" |

---

## Prioridad de cambios para bajar el score IA

1. **Hero** — agregar `CONECTADOS CONTIGO` como heading o subheading principal
2. **WhatsApp FAB** — botón flotante en todas las páginas con `0412-1471338`
3. **Trust badges** — reemplazar con los textos específicos de la tabla anterior
4. **Footer** — unificar métodos de pago con lo que acepta el checkout real
5. **Página About** — crear con dirección verificable + foto del local exterior
6. **Auth pages** — si usan ilustración SVG genérica, reemplazar con asset de marca real

---

## Páginas que no existen y bloquean el lanzamiento

- `/privacidad` — Política de privacidad (requerida para Cloudinary + GA4)
- `/terminos` — Términos y condiciones de compra
- `/devoluciones` — Política de devoluciones
- Cookie consent banner — sin esto no puede activarse GA4

---

## Fix de seguridad pendiente

`app/actions/productActions.ts` → `verifyAdminSession()` usa comparación literal de rol.
Reemplazar con `isAdminRole(session)` de `lib/api-auth.ts`.

---

## Componentes duplicados — verificar cuál editar

| Componente | Archivo activo (el que usa el layout) | Archivo muerto |
|-----------|--------------------------------------|----------------|
| Footer | `app/components/Footer.tsx` | `components/Footer.tsx` |
| ProductGridAndFilters | verificar importaciones | verificar importaciones |
| Checkout | verificar importaciones | verificar importaciones |

Antes de editar cualquiera de estos, confirmar cuál importa `app/layout.tsx`.

---

Para análisis profundo leer: [BRIEF-HUMANIZAR-MUNDOTECH.md](../../docs/BRIEF-HUMANIZAR-MUNDOTECH.md)
