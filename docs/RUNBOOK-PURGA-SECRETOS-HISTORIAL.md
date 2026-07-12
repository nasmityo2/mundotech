# Runbook: rotación de secretos y purga histórica del repositorio

**Proyecto:** mundotech (nasmityo2/mundotech)  
**Propietario:** MundoTech Barquisimeto  
**Última revisión:** 2026-07-11  
**Estado:** Pendiente de ejecución

> Este runbook describe el procedimiento para rotar secretos comprometidos y eliminar del historial Git todos los archivos que contuvieron credenciales, PII o tokens en texto plano. Siga las fases en orden. No ejecute force-push sin pasar por todas las verificaciones.

---

## 1. Incidentes conocidos

| Archivo | Rama(s) afectadas | Contenido comprometido | Riesgo | ¿Ya rotado? |
|---|---|---|---|---|
| `.env.bak*` | `main` (histórico) | DATABASE_URL, NEXTAUTH_SECRET, R2 keys, Resend API key, Binance keys, Google OAuth, CF token | Crítico — exposición completa de credenciales de BD y servicios externos | No |
| `lib/db.json` | `main` (histórico) | PII de clientes (cédula, dirección, teléfono, email) — volcado legacy | Crítico — datos personales de clientes | No |
| `sudo-credencial.md` | `main` (histórico) | Posible contraseña/credencial en texto plano (nombre sugiere credencial de sudo) | Alto | No |
| Capturas Playwright antiguas (`scripts/playwright-*.png`, `scripts/test-proof.png`) | `main` (histórico) | Posible PII visible en capturas de pantalla (pedidos, formularios, panel admin) | Medio | No |

**Nota:** Los archivos ya fueron eliminados del working tree y del staging en la Sesión 01. Este runbook cubre la **purga del historial Git** y la **rotación de secretos**.

---

## 2. Tabla de rotación

Rotar en este orden. Cada servicio debe generar nueva clave **antes** de revocar la anterior.

| # | Servicio | Variable(s) | Propietario | Impacto si no se rota | Orden |
|---|---|---|---|---|---|
| 1 | **PostgreSQL (Neon)** | `DATABASE_URL`, `DIRECT_URL` | Admin sist. | Acceso total a BD clientes, pedidos, finanzas | Reset password → nueva conexión → actualizar .env.production |
| 2 | **NextAuth** | `NEXTAUTH_SECRET` | Admin sist. | Sesiones JWT falsificables | Generar nuevo secret → todas las sesiones existentes se invalidan |
| 3 | **Cloudflare R2** | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_ACCESS_KEY_ID`, `R2_PRIVATE_SECRET_ACCESS_KEY` | Admin sist. | Acceso a imágenes de productos y comprobantes | Rotar en dashboard R2 |
| 4 | **Resend** | `RESEND_API_KEY` | Admin sist. | Envío de emails fraudulentos en nombre del dominio | Rotar en dashboard Resend |
| 5 | **Binance API** | `BINANCE_PAY_API_KEY`, `BINANCE_PAY_API_SECRET` | Admin sist. | Transacciones financieras no autorizadas | Rotar en dashboard Binance |
| 6 | **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Admin sist. | Inicio de sesión fraudulento con cuenta Google | Rotar en Google Cloud Console |
| 7 | **Cloudflare (Global)** | `CF_API_TOKEN` | Admin sist. | Control de DNS, CDN, reglas WAF | Rotar en dashboard Cloudflare |
| 8 | **CRON_SECRET** | `CRON_SECRET` | Admin sist. | Ejecución no autorizada de tareas programadas | Generar nuevo valor |
| 9 | **Upstash Redis** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Admin sist. | Rate limiting, caché, colas manipulables | Rotar en dashboard Upstash |
| 10 | **Sentry** | `SENTRY_AUTH_TOKEN` | Admin sist. | Acceso a errores internos y eventos | Rotar en dashboard Sentry |

---

## 3. Fase de contención

Ejecutar **inmediatamente** antes de la purga:

1. **Hacer el repositorio privado** en GitHub: Settings → General → Danger Zone → Change visibility → Private.
2. **Revocar todas las claves de la tabla de rotación** (Sección 2) en cada servicio:
   - Generar nueva clave en el servicio.
   - Actualizar `.env.production` en el VPS con la nueva clave.
   - **Solo entonces** eliminar/desactivar la clave anterior.
3. **Revisar logs de acceso** de cada servicio para detectar uso no autorizado en el período entre el commit del secreto y su rotación.
4. **No publicar ZIP del repositorio** ni compartir el historial Git sin purgar.
5. **Notificar al equipo** que no se realicen nuevos commits hasta completar la purga.

---

## 4. Clon fresco y backup mirror

### 4.1 Backup mirror (seguro offline)

```bash
# En una máquina de respaldo (NO en el VPS de producción)
cd /tmp
git clone --mirror git@github.com:nasmityo2/mundotech.git mundotech-backup-$(date +%Y%m%d)
# Conservar este mirror comprimido en almacenamiento offline por 90 días
tar czf mundotech-backup-$(date +%Y%m%d).tar.gz mundotech-backup-$(date +%Y%m%d)
# Mover a almacenamiento externo (ej. S3 privado, disco externo cifrado)
```

### 4.2 Clon fresco para la purga

```bash
# En la máquina donde se ejecutará git-filter-repo
cd /tmp
git clone git@github.com:nasmityo2/mundotech.git mundotech-purga
cd mundotech-purga
```

### 4.3 Verificar que git-filter-repo está instalado

```bash
which git-filter-repo || (
  pip install git-filter-repo || (
    echo "Instalar desde: https://github.com/newren/git-filter-repo"
    exit 1
  )
)
```

---

## 5. Comandos git-filter-repo

> **ADVERTENCIA:** Estos comandos reescriben el historial. Todos los colaboradores deben reclonar después del force-push.
> Cada comando se ejecuta de forma independiente. Si falla uno, deténgase y diagnostique antes de continuar.

### 5.1 Eliminar `.env.bak*` del historial

```bash
git filter-repo \
  --path-glob '.env.bak*' \
  --path-glob '.env*.bak*' \
  --invert-paths \
  --force
```

**Glob explicado:**
- `.env.bak*` — cubre `.env.bak`, `.env.backup`, `.env.bak.1`, etc.
- `.env*.bak*` — cubre `.env.production.bak`, `.env.local.bak`, etc.

### 5.2 Eliminar `lib/db.json` del historial

```bash
git filter-repo \
  --path 'lib/db.json' \
  --invert-paths \
  --force
```

### 5.3 Eliminar `sudo-credencial.md` del historial

```bash
git filter-repo \
  --path 'sudo-credencial.md' \
  --invert-paths \
  --force
```

### 5.4 Eliminar capturas Playwright antiguas del historial

```bash
git filter-repo \
  --path-glob 'scripts/playwright-*.png' \
  --path 'scripts/test-proof.png' \
  --invert-paths \
  --force
```

### 5.5 Eliminar `.next-previous/` y `vercel.json.bak*` (higiene adicional)

```bash
git filter-repo \
  --path-glob '.next-previous/**' \
  --path-glob 'vercel.json.bak*' \
  --invert-paths \
  --force
```

**Nota:** El paso 5.5 no contiene secretos pero elimina blobs de gran tamaño ya limpiados del working tree.

### 5.6 Verificar que no hay remanentes en el historial reescrito

```bash
# Check 1: confirmar que los paths NO aparecen en el historial
git log --all --full-history -- '.env.bak*' 'lib/db.json' 'sudo-credencial.md' \
  'scripts/playwright-*.png' 'scripts/test-proof.png' '.next-previous/**' 'vercel.json.bak*'

# Debe devolver vacío (sin commits)
```

---

## 6. Verificación exhaustiva

### 6.1 Búsqueda por path en objeto tree

```bash
git rev-list --objects --all | grep -E '\.env\.bak|db\.json|sudo-credencial|playwright-.*\.png|test-proof\.png|\.next-previous|vercel\.json\.bak'
```

Debe devolver **0 resultados**. Si aparece algún resultado, el path no fue completamente eliminado (revisar globs).

### 6.2 Escaneo de secretos (gitleaks)

```bash
# Instalar gitleaks si no está presente
# brew: brew install gitleaks
# binary: descargar de https://github.com/gitleaks/gitleaks/releases

gitleaks detect --source . --no-git --verbose

# Debe reportar 0 leaks. Si hay falsos positivos de CI (dummies de test),
# añadirlos a .gitleaks.toml allowlist en lugar de ignorar globalmente.
```

### 6.3 Prueba de clon fresco

```bash
cd /tmp
git clone /tmp/mundotech-purga mundotech-verify
cd mundotech-verify

# Verificar que los paths prohibidos no existen en ningún commit
git log --all --oneline | head -5    # Debe mostrar historial reescrito
git log --all --full-history -- '*.bak*' | wc -l   # Debe ser 0
git log --all --full-history -- 'db.json' | wc -l   # Debe ser 0
git log --all --full-history -- '*credencial*' | wc -l   # Debe ser 0

# Verificar que la app es funcional (node_modules no versionados)
npm install    # Debe funcionar
```

### 6.4 Verificación de ramas y tags

```bash
git branch -a    # Deben existir todas las ramas principales (main, etc.)
git tag -l       # Los tags deben preservarse
```

Si `git filter-repo --tag-filter` no se usó explícitamente, filter-repo preserva tags por defecto. Verificar que los tags no apunten a commits que contengan los archivos eliminados.

---

## 7. Force-push coordinado

### 7.1 Anuncio y ventana de mantenimiento

Enviar comunicación al equipo con al menos 24h de anticipación:

- **Ventana de mantenimiento:** 1 hora (estimar 30 min para la purga + 30 min para verificación y reclonado).
- **Acción:** force-push del historial reescrito.
- **Post-mortem:** todos los colaboradores deben reclonar.
- **CI/CD:** los workflows pueden fallar durante la ventana. Revisar después del reclonado.

### 7.2 Force-push

```bash
# Asegurarse de estar en el repositorio purgado (NO en el mirror de backup)
cd /tmp/mundotech-purga

# Push a todas las ramas y tags
git remote add origin git@github.com:nasmityo2/mundotech.git
git push origin --force --all
git push origin --force --tags
```

### 7.3 Verificación post-push

```bash
# Clonar desde GitHub a un directorio temporal
cd /tmp
git clone git@github.com:nasmityo2/mundotech.git mundotech-postpurga
cd mundotech-postpurga

# Repetir todas las verificaciones de la Sección 6
git log --all --full-history -- '.env.bak*' 'lib/db.json' 'sudo-credencial.md' | wc -l    # Debe ser 0
gitleaks detect --source . --no-git -v    # 0 leaks
npm install && npm run typecheck && npm run lint && npm test && npm run build    # Todo verde
```

### 7.4 Forks y caches

Si el repositorio tiene forks:

- Notificar a los mantenedores de forks que el historial fue reescrito.
- Los forks deben ser eliminados y recreados desde el repositorio purgado (GitHub no permite rebase cruzado de forks con historial divergente).
- Las GitHub Actions caches pueden contener referencias a blob antiguos. Recomendar: borrar todas las caches en GitHub → Actions → Caches → Delete all.

---

## 8. Rollback

En caso de error durante el force-push (ej. pérdida de commits):

```bash
# Restaurar desde el mirror offline
cd /tmp
tar xzf mundotech-backup-YYYYMMDD.tar.gz
cd mundotech-backup-YYYYMMDD

# Espejar de vuelta a GitHub
git remote set-url origin git@github.com:nasmityo2/mundotech.git
git push origin --force --all
git push origin --force --tags
```

**Consideraciones:**
- El mirror offline debe conservarse por **90 días** después de la purga exitosa.
- Si el error es parcial (ej. un tag no se empujó), restaurar ese tag específico desde el mirror.
- Documentar el incidente en `docs/RE-AUDITORIA-POST-CORRECCIONES.md`.

---

## 9. Checklist posterior y responsables

| # | Acción | Responsable | Hecho |
|---|---|---|---|
| 1 | Repositorio hecho privado en GitHub | Admin sist. | [ ] |
| 2 | Rotar DATABASE_URL / DIRECT_URL en Neon | Admin sist. | [ ] |
| 3 | Rotar NEXTAUTH_SECRET | Admin sist. | [ ] |
| 4 | Rotar R2 keys en Cloudflare | Admin sist. | [ ] |
| 5 | Rotar RESEND_API_KEY en Resend | Admin sist. | [ ] |
| 6 | Rotar Binance API keys | Admin sist. | [ ] |
| 7 | Rotar Google OAuth en Google Cloud Console | Admin sist. | [ ] |
| 8 | Rotar Cloudflare API token | Admin sist. | [ ] |
| 9 | Rotar CRON_SECRET | Admin sist. | [ ] |
| 10 | Rotar Upstash Redis tokens | Admin sist. | [ ] |
| 11 | Rotar Sentry auth token | Admin sist. | [ ] |
| 12 | Actualizar `.env.production` en VPS con nuevas claves | Admin sist. | [ ] |
| 13 | Backup mirror creado y almacenado offline | Admin sist. | [ ] |
| 14 | git-filter-repo ejecutado y verificado | Admin sist. | [ ] |
| 15 | Force-push completado | Admin sist. | [ ] |
| 16 | Reclonado verificado desde GitHub | Admin sist. | [ ] |
| 17 | CI/CD pasa tras el reclonado | Admin sist. | [ ] |
| 18 | Borrar caches de GitHub Actions | Admin sist. | [ ] |
| 19 | Repositorio vuelto a público (opcional) | Admin sist. | [ ] |
| 20 | Notificar a mantenedores de forks | Admin sist. | [ ] |

---

## Apéndice A: Prevención futura

- `.gitignore` ya incluye reglas para `.env.bak*`, `*credencial*`, `*credential*`, `lib/db.json`, capturas Playwright (Sesión 01).
- CI incluye secret scanning con gitleaks (Sesión 03).
- El equipo debe ejecutar `gitleaks detect --source . --no-git` localmente antes de cada push (pre-commit hook recomendado).

## Apéndice B: Referencias

- [git-filter-repo documentation](https://htmlpreview.github.io/?https://github.com/newren/git-filter-repo/blob/docs/html/git-filter-repo.html)
- [gitleaks documentation](https://github.com/gitleaks/gitleaks)
- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- Plan de auditoría: `PLAN-AUDITORIA-CORRECCION-MUNDOTECH.md`
- El workflow de Gitleaks debe ejecutarse con reglas predeterminadas extendidas y sin allowlist de archivos completos. Los valores dummy se permiten únicamente mediante regexes exactas.
