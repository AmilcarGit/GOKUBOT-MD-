# 🐉 Módulo Goku y temporadas

Los comandos de GokuBot están organizados aquí para que puedas editar sus textos y eventos sin tocar `index.js`.

## Archivos

- `index.js`: ejecuta los comandos y construye el menú.
- `temporadas.js`: contiene los textos, frases, regalos y temporada activa.

## Cambiar la temporada

Abre `goku/temporadas.js` y modifica:

```js
ACTIVE_SEASON: 'navidad',
```

Valores disponibles:

- `navidad`
- `anio-nuevo`
- `san-valentin`
- `halloween`
- `pascua`
- `ninguna` — desactiva los comandos festivos, pero conserva Goku.

Guarda el archivo y reinicia el bot con `npm start`.

## Personalizar contenido

En `seasons`, edita el nombre, emoji, saludo, fecha de cuenta regresiva, frases y regalos de cada temporada. En `goku`, edita los saludos, mensajes de ki y transformaciones.

Los comandos festivos conservan los mismos nombres para facilitar el cambio de temporada. El comando `.navidad` funciona como comando general del evento activo; puedes renombrarlo en `goku/index.js` si quieres un comando distinto.

## Agregar otra temporada

Copia una de las entradas de `seasons`, cambia su clave y contenido y selecciona esa clave en `ACTIVE_SEASON`. Usa meses de JavaScript de 0 a 11 en `countdown.month` (enero = 0, diciembre = 11). Para una temporada sin fecha fija, utiliza `countdown: null`.
