# Política de seguridad para GitHub Actions

## Fijación de acciones (`ACTION-PINNING-POLICY.md`)

### Principio

Este proyecto sigue la recomendación de GitHub Security Lab:
**las acciones de terceros se fijan a SHA largo de commit** cuando no hay un mecanismo
de verificación adicional. Dependabot mantiene las SHA actualizadas automáticamente
(ver `.github/dependabot.yml`).

### Acciones fijadas actualmente

| Acción | Versión legible | SHA |
|---|---|---|
| `actions/checkout` | v4.2.2 | `11bd71901bbe5b1630ceea73d27597364c9af683` |
| `actions/setup-node` | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `actions/upload-artifact` | v4.6.2 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |

### Política en workflows

1. Toda `uses:` debe apuntar al **SHA completo**, con comentario de versión legible:
   ```yaml
   uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
   ```
2. **Prohibido** usar tags flotantes (`@v4`, `@main`, `@latest`) en acciones de terceros.
3. Toda descarga externa (`curl`, `wget`) debe verificar checksum SHA-256 antes de
   ejecutar el binario (ver `secrets.yml` → Gitleaks 8.30.1).
4. Workflows de escritura (`contents: write`, `pull-requests: write`) requieren
   revisión explícita del propietario.
5. Workflows sin necesidad de escribir en el repositorio usarán `contents: read`
   y `pull-requests: read`.

### Permisos mínimos

Cada workflow declara `permissions:` explícito, nunca confía en el default de GitHub.
El default para forks es `read-all`, pero se prefiere declaración explícita.

### Referencias

- [GitHub: Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [OpenSSF Scorecard: Pinned-Dependencies](https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies)
