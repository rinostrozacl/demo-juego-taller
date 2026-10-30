# Code Runner: Escape de los Bugs

Endless runner 2D del proyecto `demo-juego-taller`. Un robot corre solo: hay que saltar bugs informáticos mientras la pista acelera. Los gráficos se dibujan en Canvas, sin imágenes externas.

- Jugar: https://demo-juego-taller.codepulse.cl
- Código: https://github.com/rinostrozacl/demo-juego-taller

## Controles

- Espacio, flecha arriba o toque en la pantalla: saltar, empezar o reiniciar.
- `R` reinicia cuando la partida terminó.
- El récord queda en `localStorage` de este navegador.

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run build` genera `dist/`. La imagen de producción es nginx con ese build: en el servidor, `npm ci` con Node 22 sobre Alpine aborta y la imagen Debian no llegó a terminar.
