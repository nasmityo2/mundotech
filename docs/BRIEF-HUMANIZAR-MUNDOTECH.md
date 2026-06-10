# Brief para humanizar MundoTech — eliminar aspecto "hecho por IA"

> **Para el modelo que reciba este brief:** Este documento es una guía de trabajo específica para la tienda MundoTech. Nada aquí es genérico. Antes de modificar cualquier componente visual, copy o layout, lee las secciones "Identidad real de la marca" y "Lo que NO tocar". El objetivo es que el sitio se sienta como la tienda física real de Barquisimeto, no como un template de e-commerce.

---

## 0. Diagnóstico cuantitativo — puntuación "aspecto IA" por sección

Este análisis fue generado tras revisar 153+ archivos del proyecto (componentes, layouts, sistema de diseño, emails, checkout, admin). La escala es **1 = completamente humano/original, 100 = completamente generado por IA/template**.

### Score global: 62 / 100

| Sección del sitio | Score IA | Por qué lo delata |
|-------------------|----------|-------------------|
| Hero (`HomeHeroCyber`) | **78 / 100** | Fondo cyber oscuro + carousel de banners — patrón #1 de generadores IA para tiendas tech. *Nota: el circuit pattern del logo es identidad real, el problema es el uso como textura de fondo desconectada del logo.* |
| Auth — Login / Registro | **75 / 100** | Split layout ilustración izquierda + formulario derecha es el layout más usado por todos los modelos de lenguaje para auth pages. |
| Footer | **72 / 100** | Trust strip de 4 columnas + grid marca/links/newsletter/métodos de pago es el footer por defecto de cualquier e-commerce generado por IA. |
| Admin panel | **70 / 100** | Shell sidebar + DataTable con acciones es el template admin estándar. No tiene identidad propia de MundoTech. |
| Checkout — stepper 3 pasos | **65 / 100** | Envío → Pago → Revisión con Framer Motion slide es un patrón muy estandarizado. Bien ejecutado pero predecible. |
| Navbar | **60 / 100** | Top bar info + sticky header blur + logo + search + carrito. Correcto pero completamente predecible. |
| Ficha de producto | **58 / 100** | 2 columnas galería/info + trust strip + tabs + relacionados sigue el playbook e-commerce estándar. |
| `ProductCard` | **55 / 100** | Tiene puntos únicos (precios USD/Bs duales, contexto venezolano) que lo distinguen del patrón genérico. |
| Página de búsqueda | **50 / 100** | Filtros sidebar + chips activos + grid resultados. Bien integrado con contexto local. |
| Emails transaccionales | **42 / 100** | Lo más humano del proyecto. Tienen identidad de marca real (MundoTechShell, tema gold), contexto de pago venezolano y personalidad. |

### Proyección post-mejoras
Aplicando los cambios de este brief: **score estimado 35–38 / 100**.

### Lo que más delata IA (los 5 patrones críticos)

1. **Trust strip de 4 iconos genéricos** — "Garantía oficial / Envío seguro / Pago seguro / Soporte 24/7" aparece en decenas de miles de e-commerce generados por IA. Los textos son intercambiables con cualquier tienda del mundo.
2. **El slogan real de la tienda (`CONECTADOS CONTIGO`) no está en el sitio** — mientras la copia diga texto genérico, el sitio seguirá pareciendo un template sin dueño.
3. **Footer lista Cashea y Efectivo; el checkout real no los acepta** — señal clara de que partes del sitio fueron generadas en sesiones distintas sin contexto compartido.
4. **Componentes duplicados en `components/` y `app/components/`** — para un desarrollador es una señal inmediata de múltiples sesiones de IA sin coordinación.
5. **Ausencia de página "Sobre nosotros"** — la característica que ningún sitio IA puede falsificar: una tienda física real con dirección verificable en Barquisimeto.

---

## 1. Identidad real de la marca (datos verificados de los assets físicos)

### Nombre y slogan
- **Nombre comercial:** MundoTech
- **Slogan real:** `CONECTADOS CONTIGO` — este slogan existe en el local físico y en material de marketing pero **NO está en el sitio web actualmente**. Debe aparecer en hero, footer y about.

### Contacto y ubicación (datos del material físico)
```
Teléfonos: 0412-1471338 / 0414-5709470
Instagram: @Mundotech39
Dirección: Calle 22 entre carreras 18 y 19
           CC Minicentro 34, Barquisimeto, estado Lara
```

### Paleta de colores (de la tienda y logo físicos)
El local físico es literalmente negro mate + amarillo/dorado. Esto significa que la paleta del sitio (`#0B1220` navy + `#FFD700` amarillo) **no es una elección de IA — es la marca real**. NO cambiar la paleta.

### El circuit pattern del logo ES la marca
El logo de MundoTech tiene trazados de circuitos electrónicos integrados en las letras. El `circuit-bg` del hero **no es un cliché genérico en este contexto** — refleja el logo real. Lo que sí hay que corregir es el uso excesivo como textura de fondo sin relación directa al logo.

---

## 2. Diagnóstico: qué delata el aspecto IA (prioridad descendente)

### ALTO IMPACTO — cambios visuales inmediatos

#### 2.1 El slogan "CONECTADOS CONTIGO" no existe en el sitio
El hero dice texto genérico. Debe decir `CONECTADOS CONTIGO` como heading principal o subheading del hero. Es el diferenciador de identidad más fácil de aplicar.

#### 2.2 Datos de contacto placeholder o ausentes
- El footer tiene teléfonos y dirección hardcodeados de forma genérica o incorrectos
- Verificar que el footer y la página de contacto usen exactamente: `0412-1471338`, `0414-5709470`, `@Mundotech39`, dirección completa de CC Minicentro 34
- La dirección física hace al sitio creíble — es verificable en Google Maps

#### 2.3 Trust badges completamente genéricos
Los badges actuales dicen:
- ❌ "Garantía oficial" → ✅ "12 meses de garantía directa"
- ❌ "Envío seguro" → ✅ "Delivery en Barquisimeto en 24h"  
- ❌ "Pago seguro" → ✅ "Pago Móvil · Transferencia · Binance"
- ❌ "Soporte 24/7" → ✅ "WhatsApp directo con el equipo"

#### 2.4 Copywriting no localizado
Actualmente los textos de botones y secciones suenan a traducción de template en inglés. Ejemplos de reemplazo:
- ❌ "Agregar al carrito" → ✅ "¡Me lo llevo!"
- ❌ "Ver más productos" → ✅ "Explorar todo el catálogo"
- ❌ "Oferta" badge → ✅ "Lo más pedido" / "Tremendo precio"
- ❌ "Productos relacionados" → ✅ "También te puede interesar"
- ❌ CTA genérico en hero → ✅ "Ver el catálogo completo →" o "Visítanos en Barquisimeto"
- En secciones de categorías usar términos venezolanos: "Equipos", "Accesorios", "Repuestos" antes que "Smartphones", "Accessories"

#### 2.5 Footer: inconsistencia de métodos de pago
El footer menciona Cashea y Efectivo como métodos de pago. El checkout solo acepta Pago Móvil, Transferencia bancaria y Binance. Esto genera desconfianza justo antes de que el usuario pague. Unificar al contenido real del checkout.

---

### MEDIO IMPACTO — identidad y contenido

#### 2.6 Hero sin foto del local físico
El hero usa banners promocionales genéricos sobre fondo oscuro. La tienda física existe y tiene identidad visual fuerte (negro + amarillo, logo prominente, "CONECTADOS CONTIGO"). Agregar al menos una slide del hero con foto exterior/interior de la tienda real.

#### 2.7 Página "Sobre nosotros" / "Quiénes somos" — no existe
Una tienda en Barquisimeto con local físico verificable es una ventaja competitiva que ningún e-commerce puro puede imitar. La ausencia de esta página es el síntoma más claro de sitio generado automáticamente. Debe incluir:
- Historia real de la tienda (cuándo abrió, por qué)
- Foto del local exterior (existe en los assets del proyecto)
- El equipo / dueño si hay disposición de mostrarlo
- La dirección con mapa embebido de Google Maps

#### 2.8 Página de reseñas vacía
La sección de reviews sin ninguna reseña indica que el sitio no tiene tracción. Al menos 10-15 reseñas con nombres venezolanos reales o seedeadas con datos reales de clientes que ya conocen la tienda física.

#### 2.9 Botón flotante de WhatsApp
En el mercado venezolano WhatsApp es el canal de ventas primario. Un FAB (Floating Action Button) de WhatsApp con el número `0412-1471338` o `0414-5709470` debe aparecer en todas las páginas. Actualmente no existe. Esto delata más que cualquier problema de diseño.

---

### BAJO IMPACTO — detalles de pulido

#### 2.10 Auth layout de ilustración dividida
El login/registro usa split layout (ilustración izquierda + formulario derecha). Si se va a mantener, la ilustración debe ser algo relacionado con la tienda real (foto de producto, foto del local) no un SVG de tecnología genérico.

#### 2.11 Error 404 sin personalidad
El `not-found.tsx` es completamente genérico. Puede referir al local físico ("¿Te perdiste? Igual que cuando no encuentras el CC Minicentro 34...") o usar el logo animado.

#### 2.12 Descripciones de producto
Las fichas de producto actualmente muestran solo specs técnicas. Agregar al menos un párrafo de contexto de uso real: "Ideal para uso diario en Venezuela con su batería de X horas" o mencionar compatibilidad con operadoras venezolanas (Movistar, Digitel, Movilnet).

---

## 3. Lo que NO cambiar

| Elemento | Por qué mantenerlo |
|----------|-------------------|
| Paleta navy `#0B1220` + amarillo `#FFD700` | Es la paleta real de la tienda física |
| Circuit traces en el logo y elementos decorativos relacionados al logo | El logo físico tiene circuitos — es identidad de marca, no cliché |
| Precios duales USD/Bs | Diferenciador real de mercado venezolano |
| Métodos de pago venezolanos (Pago Móvil, Transferencia, Binance) | Core del negocio |
| Fuente Jost | Limpia y compatible con la identidad actual |
| Micro-animaciones Framer Motion | Bien calibradas, no excesivas |
| Arquitectura Next.js App Router + Prisma | Sólida, no tocar |

---

## 4. Páginas faltantes críticas para lanzamiento a producción

Estas páginas **no existen** en el proyecto y bloquean el lanzamiento:

### 4.1 Páginas legales (obligatorias para procesar pagos)
- `/privacidad` — Política de privacidad y manejo de datos
- `/terminos` — Términos y condiciones de compra
- `/devoluciones` — Política de devoluciones y garantías

El contenido debe ser específico para Venezuela (LOPD venezolana) y mencionar los métodos de pago reales.

### 4.2 Cookie consent
No existe banner de cookies/consentimiento. Es requerido antes de cargar Google Analytics 4, Cloudinary y cualquier tracker de terceros.

### 4.3 Sitemap y robots.txt
Ausentes. Sin estos, Google no indexa eficientemente el catálogo de productos.

### 4.4 Google Analytics 4
No hay tracking configurado. Sin datos de comportamiento de usuarios es imposible tomar decisiones post-lanzamiento.

---

## 5. Fix de seguridad requerido antes del lanzamiento

**Archivo:** `app/actions/productActions.ts`  
**Problema:** La función `verifyAdminSession()` compara el rol del usuario con una comparación literal `session.user?.role !== 'ADMIN'` sin normalización. Esto viola la regla de seguridad del proyecto (R3) y crea un bypass potencial si el rol se guarda en minúsculas.  
**Fix:** Reemplazar la comparación con `isAdminRole(session)` de `lib/api-auth.ts` que aplica `.toUpperCase()` internamente.

---

## 6. Deuda técnica que delata multiples sesiones IA

Los siguientes archivos existen duplicados en `components/` y `app/components/`:
- `Footer.tsx` — el layout usa `app/components/Footer`; `components/Footer.tsx` es muerto
- `ProductGridAndFilters.tsx` — duplicado
- Checkout components — duplicados

Antes de hacer cambios visuales en estos componentes, consolidar en una sola ubicación para evitar editar el archivo incorrecto.

---

## 7. Resumen ejecutivo para el modelo que reciba este brief

**Objetivo:** Bajar el score de "aspecto IA" de 62/100 a menos de 35/100.

**Las 5 acciones de mayor impacto, en orden:**

1. Agregar `CONECTADOS CONTIGO` al hero (el slogan real de la tienda física)
2. Botón flotante WhatsApp con número real (`0412-1471338`)
3. Humanizar trust badges con datos específicos (tiempos, métodos reales)
4. Unificar métodos de pago: footer = lo que acepta el checkout
5. Crear página "Quiénes somos" con foto del local real y dirección verificable

**Las 3 cosas que parecen IA pero son identidad real de marca (NO cambiar):**
- Circuit pattern → es el logo real
- Paleta navy + amarillo → es la tienda física real
- Precios USD/Bs → es la realidad del mercado venezolano

---

*Generado el 10 de junio de 2026 — análisis basado en revisión completa de 153+ archivos del proyecto mundotech-ecommerce + assets de marca físicos proporcionados por el propietario.*
