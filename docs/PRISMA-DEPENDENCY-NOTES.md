# Prisma CLI y dependencias transitivas

## Contexto

- **Prisma CLI** (`prisma`) listado como `devDependencies` en `package.json`.
- **`@prisma/client`** (runtime) listado como `dependencies`.

## Relación de dependencias (Prisma 7)

A partir de Prisma 7, `@prisma/client` **incluye `prisma` como dependencia directa**.
Esto significa:

```text
npm ls prisma
mundotech-ecommerce@0.1.0
├─┬ @prisma/client@7.8.0 (runtime)
│ └── prisma@7.8.0 deduped
└── prisma@7.8.0 (devDependency, declarado)
```

### Implicaciones

1. **Runtime**: El binario `prisma` está disponible en producción aunque solo esté
   en `devDependencies`, porque `@prisma/client` lo incluye como dependencia.
   Sin embargo, no debe usarse en producción salvo `prisma migrate deploy` y
   `prisma generate` durante el build.

2. **DevDependency explícito**: Se mantiene `prisma` en `devDependencies` por
   claridad semántica (es una herramienta de desarrollo/compilación) y porque
   `@prisma/client` podría dejar de incluirlo en futuras versiones.

3. **Engines**: Los engines de Prisma (`schema-engine`, `query-engine`) son
   binarios nativos descargados por `prisma` (a través de `@prisma/engines`).
   Estos no aparecen en `npm audit` ni en SBOM porque no son paquetes npm,
   pero son binarios externos que se actualizan con cada versión de Prisma.

## Overrides

Actualmente **no hay overrides** en `package.json`. Si se requiere uno en el
futuro, debe:

1. Tener una **prueba que falle sin el override** y pase con él.
2. Documentar qué vulnerabilidad resuelve.
3. Usar `overrides` en `package.json` (formato npm 8+).
4. Ejecutar `npm audit` después del override para confirmar que lo resuelve.

```json
// Ejemplo (no aplicado actualmente):
"overrides": {
  "some-package": "1.2.3"
}
```

## Comandos útiles

```bash
# Ver árbol de dependencias de Prisma
npm ls prisma @prisma/client @prisma/adapter-pg

# Verificar qué binarios nativos tiene Prisma
npx prisma --version

# Ver audit solo de runtime (excluye dev)
npm audit --omit=dev --audit-level=high

# Ver audit incluyendo dev (solo documentación)
npm audit --include=dev --audit-level=moderate
```
