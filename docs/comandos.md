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
| `.aura` (con una foto o respondiendo a una) | Tu foto con aura de energía y rayos, en video |
| `.onda [texto]` | Onda de energía que se carga, se dispara y explota |
| `.poder` | Escáner verde que cuenta tu poder del RPG (>9000 activa la alerta) |
| `.esferas` | Tus esferas del dragón; con las 7 aparece el rayo de invocación |
| `.duelo @usuario` | Ahora envía el combate como video animado |

En Railway define `RAILPACK_DEPLOY_APT_PACKAGES=ffmpeg` para tener ffmpeg.

## 🤖 IA de Goku — `commands/ia.js`
Usa la API de EvoGB (`lib/evogb.js`, clave en la variable `EVOGB_KEY`).

- **Chat privado:** responde solo a cualquier mensaje sin prefijo, como Goku, y recuerda los últimos 3 intercambios. Se activa o apaga con `const AI_PRIVATE = true` en `config.js` (o la variable `AI_PRIVATE=false`).
- **Cualquier chat:** `.ia <pregunta>`; `.ia reset` borra la conversación.
- Personalidad editable en `config.js` (`ai.persona`, o variable `AI_PERSONA`); el modelo con `AI_MODEL` (por defecto `pro`).
- La etiqueta de IA de WhatsApp (`ai: true`) es experimental y viene apagada: en algunas cuentas el mensaje no se entrega. Actívala con `AI_BADGE=true`.
- En grupos responde si lo mencionas (`@bot pregunta`) o si respondes a un mensaje suyo; también con `.ia`. Se apaga con `AI_GROUPS=false`.

## 🎰 Juegos Z — `commands/juegos.js`
Se juega con los Zenis del RPG (apuesta mínima 10, máxima 5000, espera de 8 s). Cada tirada llega como video animado.

| Comando | Qué hace |
|---|---|
| `.slot <apuesta\|todo>` | Tragamonedas de esferas: 2 iguales x2, 3 iguales x10, tres de 7 estrellas x25 |
| `.ruleta <apuesta> <rojo\|negro\|verde>` | Ruleta del dragón: rojo/negro x2, verde x12 |

## 👥 Grupos — `commands/grupos.js`
Los ajustes y contadores se guardan en `data/groups.json` (el volumen de Railway).

| Comando | Quién | Qué hace |
|---|---|---|
| `.bienvenida on/off` | Admins | Tarjeta con imagen al entrar y salir un miembro |
| `.antilink on/off` | Admins | Borra enlaces de quien no sea admin (el bot debe ser admin) |
| `.todos [mensaje]` | Admins | Menciona a todos los miembros |
| `.actividad` | Todos | Imagen con los 10 miembros más activos |

## 👹 Jefes — `.jefe`
`.jefe esbirro|capitan|senor`: batalla animada contra jefes originales (Grunk, Vexor y Kragor). Su poder depende del tuyo (x0.7, x1.0 y x1.4); ganar da Zenis y XP (60/150/400 Zenis). Espera de 90 s.

## 👑 Panel del dueño — `commands/dueno.js`
Solo responde al dueño: los números o IDs de la variable `BOT_OWNER` (separados por coma) y la cuenta del propio bot.

| Comando | Qué hace |
|---|---|
| `.panel` | Estado del bot, grupos y baneados |
| `.ia on/off` | Enciende o apaga la IA en privado (se recuerda al reiniciar) |
| `.anuncio <texto>` | Envía un mensaje a todos los grupos (con pausa entre cada uno) |
| `.ban` / `.unban` | Mención, respuesta a un mensaje o número: el bot deja de responderle |
| `.reiniciar` | Reinicia el bot (Railway lo levanta solo) |
| `.miid` | Cualquiera: muestra su número e ID interno para ponerlos en `BOT_OWNER` |

## 🛠️ Imagen y audio — `commands/herramientas.js`
Todo se procesa dentro del bot con ffmpeg. Envía el archivo con el comando o responde al archivo. Máximo 25 MB y 6 s de espera por chat.

| Comando | Qué hace |
|---|---|
| `.meme arriba \| abajo` | Meme con texto blanco y borde negro sobre tu foto |
| `.bn` · `.negativo` · `.espejo` · `.blur` · `.pixelar` | Filtros de imagen |
| `.mp3` | Convierte un video o audio a MP3 |
| `.rapido` · `.lento` · `.ardilla` · `.grave` · `.eco` | Efectos de voz; vuelve como nota de voz |

## 🃏 Guerreros originales — `commands/guerreros.js`
13 guerreros de diseño propio (comunes, raros, épicos y legendarios), con retratos dibujados por el bot en `lib/warriors.js`. Se guardan en `data/warriors.json`.

| Comando | Qué hace |
|---|---|
| `.invocar` | Cuesta 250 Zenis. Animación de invocación y carta nueva (repetidas suben +10% de poder) |
| `.coleccion` | Imagen con tu colección; los que no tienes salen como sombra |
| `.guerrero <nombre\|nº>` | Carta grande de un guerrero que ya tienes |
| `.guerreros` | Lista de todos los guerreros |

Probabilidades: común 55%, raro 28%, épico 13%, legendario 4%.

## 🎁 Regalos y control de jugadores (solo dueño)
El destinatario es la persona mencionada, el mensaje al que respondes, un número completo (con código de país) o, si no pones ninguno, tú mismo.

| Comando | Qué hace |
|---|---|
| `.dar <zenis> [@usuario]` | Regala Zenis (hasta 10.000.000) |
| `.quitar <zenis> [@usuario]` | Quita Zenis (no baja de 0) |
| `.darxp <cantidad> [@usuario]` | Regala XP; puede subir de nivel |
| `.daresfera <1-7\|todas> [@usuario]` | Regala esferas del dragón |
| `.darguerrero <nombre\|nº> [@usuario]` | Regala un guerrero a su colección |
| `.jugador [@usuario]` | Ve nivel, poder, Zenis, esferas y récord |
| `.resetjugador @usuario confirmar` | Borra el progreso RPG de un jugador |

## ⚡ Bonus de guerreros y economía
- **Bonus de equipo:** tus 3 mejores guerreros suman el 20% de su poder a tu poder en el RPG (duelos, jefes, ranking). Lo ves en `.coleccion`.
- `.regalar @usuario <zenis>`: regala Zenis a otro jugador (mínimo 10, comisión del 5%). También respondiendo a su mensaje.
- `.ricos`: imagen con los 10 jugadores con más Zenis.

## 🔊 Voz de Goku — `lib/voice.js`
Texto a voz en español (Google Translate TTS) con un efecto que la hace más grave y enérgica. Es una voz sintética, no la voz real del personaje.

- **En privado**, la IA responde con nota de voz si la respuesta mide hasta 450 caracteres; si es más larga, o si falla la voz, manda texto.
- `.voz on/off`: cada chat elige si quiere audio o texto.
- `.hablar <texto>`: Goku dice lo que escribas (máx. 300 caracteres), en cualquier chat.
- Variables: `AI_VOICE=false` apaga la voz para todos, `AI_VOICE_PITCH` (0.6–1.2, por defecto 0.82; más bajo = más grave) y `AI_VOICE_MAX`.
- Requiere ffmpeg y que el servidor pueda llegar a `translate.google.com`.

## 🧩 Interactivo (botones nativos de Yui-Bails) — `commands/interactivo.js`
| Comando | Qué hace |
|---|---|
| `.trivia` | Pregunta de Dragon Ball con 3 botones; solo quien la pidió puede responder. Acertar da 80 Zenis (máx. 10 premios al día) |
| `.menui` | Menú desplegable con submenús por categoría |
| `.encuesta pregunta \| a \| b ...` | Encuesta nativa de WhatsApp (2 a 12 opciones) |
| `.recordar <tiempo> <texto>` | Te menciona pasado el tiempo (30s a 7 días, máx. 5 pendientes). Se guarda en `data/programados.json` |

> Los comandos antiguos de personajes con nombres de la serie pasaron a `.invocarz`; `.invocar` y `.coleccion` ahora son los de los guerreros originales.

## 🧠 La IA ahora hace cosas
- **Recordatorios hablando normal** (en privado, o mencionándolo en un grupo): "recuérdame en 10 minutos sacar la pizza", "en 2 horas avísame que llame a mamá". No usa la IA: se programa directo, de 30 segundos a 7 días.
- **Acciones:** si le pides algo como "muéstrame mi poder", "hazme una tarjeta con mi nombre" o "ponme una trivia", Goku responde y ejecuta el comando. Acciones permitidas: poder, esferas, perfil, tarjeta, nevada, fuegos, dragon, onda, top, coleccion, trivia, menu, menui. Nunca ejecuta comandos que gasten Zenis (slot, ruleta, invocar, regalar), borren datos o sean del dueño.
- **Programación:** si le pides código, lo entrega completo en un bloque y con un botón **📋 Copiar código** (hasta 3 bloques de máx. 2000 caracteres; con `AI_COPY_BUTTON=false` se apaga). Las respuestas con código llegan siempre como texto, no como voz.


## WhatsApp nativo

| Comando | Qué hace |
|---|---|
| `.copiar <texto>` | Mensaje con botón **📋 Copiar** (o responde a un mensaje) |
| `.contacto` / `.creador` | Tarjeta de contacto del creador + botón al repositorio |
| `.ubicacion` | Envía una ubicación de un lugar del universo Z |
| `.repo` | Botones: abrir repositorio / copiar enlace |
| `.cargar` | Barra de ki que se actualiza editando un solo mensaje |

El bot reacciona con ⚡ a cada comando (`REACTIONS=false` lo apaga).

## Diario, mascota y torneo

| Comando | Qué hace |
|---|---|
| `.diario` | Recompensa diaria animada; cada día seguido paga más y el día 7 regala una esfera |
| `.racha` | Tu racha actual, mejor racha y próxima recompensa |
| `.adoptar` | Adopta una mascota original (Draki, Kori o Nimbo) por 300 Zenis |
| `.mascota` | Tu mascota animada con ánimo y XP; evoluciona en los niveles 2, 5 y 10 |
| `.alimentar` / `.acariciar` | Cuídala (comer cuesta 40 Zenis); sube XP |
| `.skins` / `.skin <nombre>` | Fondos animados: cielo, atardecer, nebulosa y dorado |
| `.nombrarmascota <nombre>` | Ponle nombre |
| `.torneo` (admin) | Abre inscripciones del Torneo Tenkaichi en el grupo (2 min, máx. 8) |
| `.unirme` / `.empezar` / `.cancelartorneo` | Inscribirse, iniciar antes o cancelar |
| `.torneo top` | Campeones del grupo |

Una mascota sana (con ánimo) da hasta +20% de Zenis en `.diario`. El campeón del torneo recibe un mensaje animado que el bot intenta fijar en el grupo.


## IA más humana y música

La IA ahora escribe como una persona en WhatsApp (frases cortas, natural; si le preguntan en serio, admite que es un bot). Si le pides una canción ("ponme una de Bad Bunny"), usa `.play`, la envía y deja botones **🎬 Ver el video**, **🔎 Más opciones** y **🔗 Buscar en YouTube**. También entiende "mándame el video de…" (`.ytmp4`) y "busca…" (`.yts`). Para cambiar su personalidad usa la variable `AI_PERSONA`.

## Descargas de redes y botones en .yts

| Comando | Qué hace |
|---|---|
| `.tiktok <enlace>` / `.tt` | Video de TikTok sin marca de agua (o fotos si es presentación) |
| `.ig <enlace>` / `.instagram` | Reel, video o foto de Instagram |
| `.fb <enlace>` / `.facebook` | Video de Facebook |
| `.dl <enlace>` | Detecta la red solo (también responde a un mensaje con enlace) |
| `.ttmp3 <enlace>` | Solo el audio de un TikTok |

APIs gratuitas: **tikwm.com** (TikTok) y **downaria.vercel.app** (Instagram/Facebook, y respaldo de TikTok). Sin clave, downaria permite 5 pedidos cada 2 minutos; con `DOWNARIA_KEY` en Railway el límite sube.

`.yts` ahora manda, para cada uno de los 3 primeros resultados, botones **🎵 Audio**, **🎬 Video** y **🔗 Abrir**.
