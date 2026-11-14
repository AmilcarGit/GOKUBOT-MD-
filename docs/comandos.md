# Comandos de GokuBot-MD

Todos los mensajes salen con el tema activo (`BOT_THEME`, carpeta `themes/`).

Los ejemplos usan el prefijo `.` (configurable con `BOT_PREFIX`). Cada categoría vive en un archivo distinto dentro de `commands/`; el orden de prioridad está en `commands/index.js`.

## 📋 Menú — `commands/menu.js`
`.menu` / `.help`. La lista de comandos del menú está en `CATEGORIES` dentro de ese archivo.

## 🐉 Goku y temporadas — `commands/goku/index.js`
| Comando | Descripción |
|---|---|
| `.goku` | Saludo Saiyajin |
| `.ki` | Lectura de energía |
| `.transformacion` | Niveles Saiyajin |
| `.evento` / `.temporada` / `.navidad` | Estado y cuenta regresiva de la temporada activa |
| `.frase` · `.regalo` · `.arbol` | Contenido festivo |
| `.felicitar <nombre>` | Felicitación personalizada |
| `.sorteo` | Sorteo entre los miembros del grupo |

Los comandos festivos solo funcionan con una temporada activa (ver `config.js`).

## ⚔️ RPG Saiyajin — `commands/goku/rpg.js`
`.perfil` · `.nivel` · `.entrenar` · `.transformar` · `.duelo @usuario` · `.ranking` · `.misiones` · `.reclamar` · `.tienda` · `.comprar <id>` · `.inventario` · `.shenlong`

Guía completa en [rpg.md](rpg.md).

## 🎴 Personajes — `commands/goku/personajes.js`
`.personajes` (o `.coleccion`) · `.invocar` · `.misguerreros` · `.mejorar <id>`

## 🌐 Utilidades YuiAPI — `commands/yui.js`
Requieren `YUI_API_KEY`.

- **Búsquedas:** `.wiki` `.anime` `.libro` `.serie` `.pais` `.paper` `.ebook` `.musica`
- **Imágenes:** `.imagen` `.pinterest` `.pindl`
- **Stickers:** `.sticker` (`.s`) `.stickertxt` `.rmbg`
- **Herramientas:** `.qr` `.clima` `.cambio` `.traducir` `.hash` `.uuid` `.password` `.plan`
- `.menuapi`: lista de comandos de YuiAPI

## 🎬 YouTube — `commands/youtube.js`
| Comando | Descripción |
|---|---|
| `.yts <texto>` (`.ytsearch`) | 5 resultados numerados |
| `.play <texto>` | Busca y envía el audio del primer resultado |
| `.ytmp3` (`.yta`, `.ytaudio`) `<texto \| link \| nº>` | Descarga audio |
| `.ytmp4` (`.ytv`, `.ytvideo`) `<texto \| link \| nº>` | Descarga video |

Tras `.yts`, el número elige un resultado: `.ytmp3 2`. Se prueba YuiAPI primero y luego `MEDIA_API_URL` como respaldo (`lib/youtube.js`). Límite: 90 MB.

## 📊 Estado del bot — `commands/estado.js`
`.estado` (`.status`, `.botstatus`): tarjeta que se **actualiza sola 6 veces** (cada 4 s) editando el mismo mensaje. Muestra conexión, ping, tiempo activo, CPU, RAM, disco, mensajes y comandos atendidos, reconexiones, errores, jugadores del RPG, sesión, claves configuradas (solo ✅/❌, nunca el valor), servidor, versión desplegada y tema. Los datos vienen de `lib/status.js`.

## ⚙️ Generales — `commands/general.js`
`.ping` · `.owner`

## Agregar un comando nuevo
1. Crea `commands/<categoria>.js` que exporte `async (sock, m, jid, cmd, text, prefix)` y devuelva `true` si atendió el comando.
2. Regístralo en la lista de `commands/index.js`.

## 🎨 Imágenes y animaciones — `commands/visual.js`
Todo se dibuja dentro del bot (`lib/canvas.js`, `lib/scenes.js`), sin APIs externas. Los videos y stickers usan **ffmpeg** (`lib/video.js`); si no está instalado, se envía una imagen fija.

| Comando | Qué hace |
|---|---|
| `.tarjeta [nombre]` | Tarjeta navideña en imagen con tu nombre |
| `.top` | Ranking Top 10 del RPG como imagen |
| `.nevada` | Video en bucle: noche con árboles y nieve |
| `.fuegos` | Video en bucle: fuegos artificiales |
| `.dragon` | Video en bucle: Shenlong y las 7 esferas |
| `.stickeranim <texto>` | Sticker animado con letras de colores |
| `.stickeranim` (respondiendo a un video/GIF) | Convierte el video en sticker animado (máx. 6 s) |
| `.duelo @usuario` | Ahora envía el combate como video animado |

En Railway define `RAILPACK_DEPLOY_APT_PACKAGES=ffmpeg` para tener ffmpeg.
