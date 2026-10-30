## [2026-10-30]

### Proyecto: demo-juego-taller

**Contexto**

Endless runner "Code Runner: Escape de los Bugs" para el taller de egresados. Repositorio público `rinostrozacl/demo-juego-taller` y sitio `https://demo-juego-taller.codepulse.cl`.

**Cambios**

- Juego en TypeScript, Canvas y Vite: salto, bugs, aceleración, colisión, puntuación y récord en localStorage.
- 15 pruebas de reglas puras, build de producción y despliegue en Coolify OVH (proyecto y app nuevos, entorno production).
- Invitación enviada desde Gmail a la lista de participantes.

**Decisiones**

- El dominio ya resolvía por el comodín `*.codepulse.cl`; no se tocó Cloudflare.
- La imagen de producción es nginx con `dist/` versionado. `npm ci` en Node 22 Alpine aborta con "Exit handler never called" y el build sobre Debian no terminó en el servidor.

**Próximos pasos**

- Si el servidor deja de fallar al instalar npm, volver a un Dockerfile multi-stage que ejecute pruebas y `npm run build`.

**Archivos afectados**

- `src/`, `Dockerfile`, `nginx.conf`, `dist/`, `README.md`

#feature #docs
