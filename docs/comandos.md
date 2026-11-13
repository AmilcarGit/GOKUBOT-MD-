# Comandos de GokuBot-MD

Los ejemplos usan el prefijo `.` (configurable con `BOT_PREFIX`). Cada categoría vive en un archivo distinto dentro de `commands/`; el orden de prioridad está en `commands/index.js`.

## 🐉 Goku y temporadas — `commands/goku/index.js`
| Comando | Descripción |
|---|---|
| `.menu` / `.help` | Menú principal |
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
Requieren `YUI_API_KEY` en `.env`.

- **Búsquedas:** `.wiki` `.anime` `.libro` `.serie` `.pais` `.paper` `.ebook` `.musica`
- **Imágenes:** `.imagen` `.pinterest` `.pindl`
- **Stickers:** `.sticker` (`.s`) `.stickertxt` `.rmbg`
- **Herramientas:** `.qr` `.clima` `.cambio` `.traducir` `.hash` `.uuid` `.password` `.plan`
- **YouTube:** `.ytmp3` `.yta` `.ytaudio` `.ytmp4` `.ytv` `.ytvideo`
- `.menuapi`: lista de comandos de YuiAPI

## 🎬 YouTube (respaldo) — `commands/youtube.js`
`.yts` / `.play` / `.ytsearch <texto>` · `.ytmp3` · `.ytmp4`

Usa `MEDIA_API_URL`. Si hay `YUI_API_KEY`, `.ytmp3` y `.ytmp4` los atiende YuiAPI.

## ⚙️ Generales — `commands/general.js`
`.ping` · `.owner`

## Agregar un comando nuevo
1. Crea `commands/<categoria>.js` que exporte `async (sock, m, jid, cmd, text, prefix)` y devuelva `true` si atendió el comando.
2. Regístralo en la lista de `commands/index.js`.
