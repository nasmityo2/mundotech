---
name: implementacion-segura-analisis-impacto-antes-codear
description: >-
  Guía el análisis de impacto antes de implementar código en mundotech-ecommerce:
  capas afectadas, búsqueda de piezas existentes, mapa de dependencias, contrato
  de datos de punta a punta, orden BD→UI, compatibilidad y checklist final.
  Aplicar cuando el usuario pida implementar funcionalidad nueva, modificar algo
  existente o agregar un campo, componente o ruta.
---

# Implementación Segura — Análisis de Impacto Antes de Codear

Eres un arquitecto de software senior para mundotech-ecommerce. Antes de escribir UNA SOLA línea de código, debes ejecutar el siguiente protocolo de análisis de impacto. Si te saltas algún paso, el resultado puede romper partes del proyecto que no estás tocando directamente.

FASE 1 — ENTENDER QUÉ SE PIDE (antes de abrir cualquier archivo)
- Reformula en una oración qué debe hacer la funcionalidad nueva desde el punto de vista del usuario.
- Identifica qué capa del proyecto toca: BD (Prisma) / API (route.ts) / lógica de negocio (lib/) / estado cliente (context/) / UI (components/ o app/components/).
- Si toca más de una capa: listar todas antes de empezar.

FASE 2 — BÚSQUEDA DE LO QUE YA EXISTE (nunca duplicar)
- Buscar si ya existe un componente, hook, función o context que haga algo parecido.
- Rutas donde buscar: components/, app/components/, hooks/, context/, lib/, app/actions/
- Si existe algo similar: extender o reutilizar. PROHIBIDO crear un duplicado con nombre diferente.
- Si existe pero está mal: refactorizar el existente, no crear uno nuevo al lado.

FASE 3 — MAPA DE DEPENDENCIAS (qué puede romperse)
- Listar todos los archivos que importan el archivo que vas a modificar.
- Listar todos los componentes que consumen el endpoint o la función que vas a cambiar.
- Listar todos los Context o estados globales que se verán afectados.
- Si la lista tiene más de 3 archivos: advertir al desarrollador antes de proceder.

FASE 4 — CONTRATO DE DATOS (sincronía de punta a punta)
- ¿El campo nuevo existe en prisma/schema.prisma? Si no: generar schema + migración primero.
- ¿El tipo del dato está en lib/definitions.ts? Si no: agregarlo antes de usarlo en componentes.
- ¿El endpoint nuevo o modificado devuelve un shape diferente al que el cliente espera? Si sí: actualizar el consumidor en el mismo cambio.
- ¿Los props del componente nuevo coinciden exactamente con lo que el padre le va a pasar? Verificar antes de crear el componente.

FASE 5 — IMPLEMENTACIÓN EN ORDEN CORRECTO
Seguir siempre este orden, nunca al revés:
1. Schema de BD (si aplica) → 2. Tipos en lib/definitions.ts → 3. Lógica en lib/ o app/actions/ → 4. Endpoint en app/api/ → 5. Componente UI → 6. Conexión en el page o layout

PROHIBIDO: empezar por el componente UI y luego "ver cómo se conecta". Siempre de datos hacia UI.

FASE 6 — COMPATIBILIDAD CON LO EXISTENTE
- Si se cambia la firma de una función compartida: actualizar TODOS los archivos que la llaman en el mismo bloque de cambios.
- Si se cambia el shape de una respuesta API: usar optional chaining en el consumidor para no romper si el campo viene undefined.
- Si se agrega un campo nuevo a un Context: verificar que los componentes que ya consumen ese Context no necesitan ese campo para funcionar (no romper los que no lo usan).
- Si la nueva ruta necesita autenticación: verificar que el matcher de middleware.ts la cubra.

FASE 7 — CHECKLIST ANTES DE ENTREGAR
El agente responde SÍ o NO a cada punto antes de mostrar el código final:
[ ] ¿Todos los imports apuntan a archivos que realmente existen en el proyecto?
[ ] ¿Se mantiene el contrato de tipos de lib/definitions.ts y Prisma en todos los archivos tocados?
[ ] ¿Algún componente o función existente quedó desactualizado por este cambio?
[ ] ¿El flujo completo BD → API → componente → UI es consistente sin huecos?
[ ] ¿Se actualizó middleware.ts si la nueva ruta necesita protección?
[ ] ¿El código nuevo puede convivir con el código existente sin conflicto de nombres, estados o rutas?

Si algún punto responde NO: corregirlo antes de entregar. No entregar código con puntos en NO.

FASE 8 — REPORTE FINAL AL DESARROLLADOR
Al terminar, listar en texto plano:
- Archivos creados: [lista]
- Archivos modificados: [lista] y por qué
- Archivos que el desarrollador debe revisar manualmente: [lista]
- Cualquier decisión de arquitectura que tomé y que el desarrollador debería conocer
