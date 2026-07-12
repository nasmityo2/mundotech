# Checklist manual de accesibilidad — MundoTech

> Este checklist complementa el escaneo automatizado con axe-core (`e2e/specs/axe-a11y.spec.ts`).
> Los tests automatizados cubren violaciones critical/serious en rutas críticas y overlays.
> Este checklist cubre aspectos que solo pueden verificarse manualmente.

---

## 1. Navegación por teclado

### Tab order visible

- [ ] **Home**: Tab desde el logo → enlaces de categorías → productos destacados → footer. El foco visible (outline) nunca se pierde.
- [ ] **PDP**: Tab desde título → precio → descripción → "Agregar al carrito" → galería de imágenes. El botón principal es alcanzable sin pasar por 20 elementos.
- [ ] **Cart**: Tab desde items del carrito → input de cupón → botón "Aplicar" → botón "Ir al checkout". Sin trampas de foco.
- [ ] **Checkout**: Tab a través de todos los campos del formulario en orden lógico. Sin saltos.
- [ ] **Admin dashboard**: Tab a través de cards de resumen → sidebar de navegación → contenido principal.

### Skip links

- [ ] Existe un "Saltar al contenido" (skip-to-content) como primer elemento focusable en todas las páginas.
- [ ] El skip link es visible al recibir foco (no solo `sr-only`).

### Sin trampas de foco

- [ ] **CartDrawer**: Tab循环 dentro del drawer; Escape cierra; foco retorna al botón que lo abrió.
- [ ] **CategoryDrawer**: Igual que CartDrawer — focus trap funciona.
- [ ] **SearchMobileOverlay**: Foco atrapado dentro del overlay; Escape cierra.
- [ ] **PromoPopup**: Foco atrapado; Escape cierra; al cerrar, foco retorna al trigger.

### Funcionalidad sin mouse

- [ ] **Agregar al carrito**: Enter/Space en el botón funciona.
- [ ] **Cambiar cantidad**: Los botones +/- son focusables y activables con teclado.
- [ ] **Eliminar item del carrito**: Botón de eliminar es focusable.
- [ ] **Aplicar cupón**: Enter en el botón "Aplicar" funciona.
- [ ] **Submit de checkout**: Enter en el botón "Confirmar pedido" envía el formulario.
- [ ] **Logout**: Enter/Space en el botón "Cerrar sesión" funciona.

---

## 2. Lectores de pantalla

### VoiceOver (macOS / Safari)

- [ ] **Home**: VO navega por headings (h1-h3) correctamente. Productos se anuncian con nombre, precio y disponibilidad.
- [ ] **PDP**: VO lee título (h1), precio, descripción, botón "Agregar al carrito". Las imágenes tienen alt text descriptivo.
- [ ] **Cart**: VO anuncia items, cantidades, subtotales, total. Los botones tienen aria-label adecuados.
- [ ] **CartDrawer**: Al abrirse, VO anuncia "Carrito de compras, dialog". Los items se leen correctamente.
- [ ] **CategoryDrawer**: Al abrirse, VO anuncia "Categorías". Los enlaces se navegan en orden.
- [ ] **SearchMobileOverlay**: Foco va al input de búsqueda. Los resultados se anuncian.
- [ ] **Checkout**: VO navega campos, radios de pago, botón submit.
- [ ] **Login/Registro**: VO lee labels, errores de validación.

### TalkBack (Android / Chrome)

- [ ] Mismas verificaciones que VoiceOver en un dispositivo Android real.
- [ ] Gestos de deslizamiento funcionan para navegar entre elementos.
- [ ] Doble-toque para activar botones funciona.

### NVDA (Windows / Firefox)

- [ ] Mismas verificaciones que VoiceOver en Windows con NVDA + Firefox.

---

## 3. Zoom y tamaño de texto

### Zoom 200%

- [ ] **Todas las páginas**: Sin corte horizontal, sin contenido superpuesto, sin botones que desaparecen.
- [ ] **Navbar**: Los items del menú no se rompen ni se ocultan ilegiblemente.
- [ ] **Product grid**: Los productos se reordenan en 1-2 columnas sin superposición.
- [ ] **Cart**: La tabla de items se vuelve legible (scroll horizontal si es necesario, sin truncar texto).
- [ ] **Checkout**: Los campos del formulario mantienen tamaño legible.

### Zoom 400%

- [ ] Funcionalidad mínima preservada: se puede completar checkout (puede requerir scroll).
- [ ] Los botones principales ("Agregar al carrito", "Confirmar pedido") son alcanzables.

### Aumento de tamaño de fuente (solo navegador, 200%)

- [ ] Sin pérdida de contenido.
- [ ] Sin superposición de elementos.

---

## 4. Contraste y color

### Contraste mínimo (relación 4.5:1 texto normal, 3:1 texto grande)

- [ ] **Texto sobre fondos de color**: Verificar en hero banners, promos, badges.
- [ ] **Links en párrafos**: El color del link se distingue del texto circundante (no solo por subrayado si usa color).
- [ ] **Placeholder vs. texto ingresado**: El placeholder tiene suficiente contraste (al menos 4.5:1).
- [ ] **Botones**: Texto del botón contra su fondo cumple 4.5:1.
- [ ] **Admin sidebar**: Texto de navegación contra el fondo del sidebar.

### Contraste de componentes (UI y gráficos)

- [ ] **Bordes de input**: El borde del input es distinguible del fondo blanco.
- [ ] **Iconos**: Los iconos funcionales (carrito, búsqueda, menú) tienen contraste suficiente.
- [ ] **Badges de stock**: "En stock" / "Agotado" usan color + icono + texto (no solo color).

### No solo color

- [ ] **Errores de formulario**: Se indican con texto + icono, no solo con borde rojo.
- [ ] **Estados de pedido**: Cada estado usa texto + color, no solo color.
- [ ] **Links**: Se distinguen del texto normal (subrayado o icono además de color).

---

## 5. Movimiento reducido

### prefers-reduced-motion

- [ ] **Home**: Animaciones de hero, productos, promos se reducen o eliminan.
- [ ] **CartDrawer**: La animación de slide se reduce a fade o instantánea.
- [ ] **CategoryDrawer**: Animación reducida.
- [ ] **PromoPopup**: Animación de entrada reducida.
- [ ] **Transiciones de página**: Sin movimiento excesivo.

---

## 6. Formularios

### Labels y errores

- [ ] **Todos los inputs** tienen `<label>` asociado (no solo placeholder).
- [ ] **Errores de validación**: Se anuncian con `aria-describedby` o `aria-errormessage`.
- [ ] **Errores**: Son específicos ("El correo electrónico no es válido") no genéricos ("Error en el formulario").
- [ ] **Required**: Campos obligatorios marcados con `required` y/o `aria-required="true"`.

### Autocompletado

- [ ] **Checkout**: Campos de nombre, dirección, teléfono tienen `autocomplete` apropiado.
- [ ] **Login**: `autocomplete="email"` y `autocomplete="current-password"`.
- [ ] **Registro**: `autocomplete="email"` y `autocomplete="new-password"`.

---

## 7. Páginas de error

- [ ] **404**: Mensaje claro, enlace para volver al home.
- [ ] **500**: Mensaje amigable, sin detalles técnicos.
- [ ] **403 (admin)**: Mensaje claro, sin exponer información interna.

---

## 8. Dispositivos y orientación

### Landscape

- [ ] **Home y cart**: El contenido se ajusta sin pérdida al girar a landscape en mobile.
- [ ] **Checkout**: Formulario usable en landscape.
- [ ] **Admin**: Tablas scrolleables horizontalmente sin romper layout.

### Portrait

- [ ] Sin contenido cortado en la parte inferior en mobile portrait.

---

## Fechas de verificación

| Fecha | Verificador | Notas |
|---|---|---|
| — | — | — |

---

## Historial de cambios

- **2026-07-12**: Versión inicial. Checklist creado con 35 ítems manuales.
