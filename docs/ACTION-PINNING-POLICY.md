# Política de seguridad para GitHub Actions

## Fijación de acciones (`ACTION-PINNING-POLICY.md`)

### Principio

Este proyecto sigue la recomendación de GitHub Security Lab:
**las acciones de terceros se fijan a SHA largo de commit** cuando no hay un mecanismo
de verificación adicional. Dependabot mantiene las SHA actualizadas automáticamente
(ver `.github/dependabot.yml`).

### Excepciones

- `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`:
  se fijan a SHA específico de la versión v4.x más reciente. Dependabot las actualiza
  semanalmente dentro del major v4.
- Acciones oficiales de GitHub (bajo `actions/`) con despliegue lento y firmado:
  aceptan pinning a SHA por versión exacta.

### Política en workflows

1. Toda `uses:` debe tener un comentario con la versión legible y el SHA:
   ```yaml
   uses: actions/checkout@v4  # v4.2.2 → 11bd71901bbe5b1630ceea73d27597364c9af683
   ```
2. Toda descarga externa (`curl`, `wget`) debe verificar checksum SHA-256 antes de
   ejecutar el binario.
3. Workflows de escritura (`contents: write`, `pull-requests: write`) requieren
   revisión explícita del propietario.
4. Workflows sin necesidad de escribir en el repositorio usarán `contents: read`
   y `pull-requests: read`.

### Permisos mínimos

Cada workflow declara `permissions:` explícito, nunca confía en el default de GitHub.
El default para forks es `read-all`, pero se prefiere declaración explícita.

### Referencias

- [GitHub: Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [OpenSSF Scorecard: Pinned-Dependencies](https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies)
