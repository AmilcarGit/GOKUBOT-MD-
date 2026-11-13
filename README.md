<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0b3d2e,50:c0392b,100:0b3d2e&height=230&section=header&text=GokuBot-MD&fontSize=68&fontColor=ffffff&animation=twinkling&fontAlignY=36&desc=🎄%20Saiyan%20Xmas%20Edition%20🎄&descSize=24&descAlignY=58" alt="GokuBot-MD Saiyan Xmas" />

<a href="https://github.com/AmilcarGit/GOKUBOT-MD-">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=3200&pause=900&color=FF4D4D&center=true&vCenter=true&width=640&lines=🎅+Feliz+Navidad,+Guerrero+Z!;🐉+Bot+de+WhatsApp+con+poder+Saiyajin;❄️+RPG,+YouTube,+stickers+y+mucho+más;🎁+Cambia+todo+el+estilo+con+un+solo+archivo" alt="Animación de texto" />
</a>

<br/>

![Node](https://img.shields.io/badge/Node.js-20%2B-2e7d32?style=for-the-badge&logo=node.js&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Railway](https://img.shields.io/badge/Deploy-Railway-8e44ad?style=for-the-badge&logo=railway&logoColor=white)
![Tema](https://img.shields.io/badge/Tema-Navidad_🎄-c0392b?style=for-the-badge)
![Licencia](https://img.shields.io/github/license/AmilcarGit/GOKUBOT-MD-?style=for-the-badge&color=f1c40f)

**❄️ 🎄 ⭐ 🎁 🔔 🎅 🦌 ⛄ 🕯️ ✨ 🎄 ❄️ ⭐ 🎁 🔔 🎅 🦌 ⛄**

</div>

Bot de WhatsApp construido con **Node.js** y **Baileys**. Combina comandos de Goku, un RPG Saiyajin, descargas de YouTube y herramientas de YuiAPI, todo con un **tema navideño** que vive en un solo archivo.

> 🎁 **Crea tu propia instancia:** instala el proyecto, vincula tu propio número de WhatsApp, configura tus claves y personaliza el nombre, prefijo y tema.

---

## 📑 Contenido

- [✨ Características](#-características)
- [🎄 Tema navideño](#-tema-navideño)
- [🎮 Comandos](#-comandos)
- [🚀 Instalación](#-instalación-en-android-termux)
- [☁️ Railway](#️-despliegue-en-railway)
- [⚙️ Configuración](#️-configura-tu-propio-bot)
- [🎨 Crea tu propio tema](#-crea-tu-propio-tema)
- [📁 Estructura](#-estructura-del-proyecto)
- [❓ Problemas frecuentes](#-problemas-frecuentes)

---

## ✨ Características

| | |
|---|---|
| 🎄 **Temas visuales** | Emojis, marcos y letras navideñas definidos en `themes/`. Cambias un archivo y cambian **todos** los comandos |
| 🐉 **Universo Goku** | Saludos, lectura de ki y transformaciones Saiyajin |
| ⚔️ **RPG Saiyajin** | Niveles, XP, duelos, misiones diarias, tienda y esferas del dragón |
| 🎴 **Personajes** | Invoca guerreros, junta fragmentos y mejóralos |
| 🖼️ **Tarjetas PNG** | Perfil generado localmente, sin API de imágenes |
| 🎬 **YouTube** | `.yts`, `.play`, `.ytmp3` y `.ytmp4` con respaldo automático entre varias APIs |
| 🌐 **YuiAPI** | Stickers, QR, clima, traducción, búsquedas y más |
| 🎅 **Modo Navidad** | Cuenta regresiva, frases, regalos, árbol y sorteos |
| ☁️ **Listo para Railway** | Sesión en volumen y vinculación sin terminal |
| 📱 **Termux y PC** | Funciona en Android y en computadora |

---

## 🎄 Tema navideño

Todos los mensajes del bot pasan por el tema activo: marcos con nieve y regalos, encabezados con **letras navideñas** y un pie festivo.

```text
╔═══ ❄️ ═══ 🎄 ═══ ❄️ ═══╗
   ✨ *𝓟𝓮𝓻𝓯𝓲𝓵 𝓢𝓪𝓲𝔂𝓪𝓳𝓲𝓷* ✨
╚═══ 🎁 ═══ ⭐ ═══ 🎁 ═══╝

╭━━〔 🎅 𝓨𝓸𝓾𝓣𝓾𝓫𝓮 〕━━╮
┃ 🎁 .yts <texto>
┃ 🎁 .play <texto>
┃ 🎁 .ytmp3 <texto|link|nº>
┃ 🎁 .ytmp4 <texto|link|nº>
╰━━━━ ❄️ ⭐ ❄️ ━━━━╯

🎄❄️⭐❄️🎄
```

**¿Cómo funciona?**

- 🎨 El aspecto está en [`themes/navidad.js`](themes/navidad.js): emojis, marcos, tipo de letra y frases del pie.
- 🔌 Un adaptador (`lib/theme.js`) aplica el tema a **todo** mensaje saliente, incluidos los comandos que agregues después.
- 🔁 Cambia de tema con una variable: `BOT_THEME=navidad` o `BOT_THEME=clasico`.
- 🎅 El tema Navidad también activa los comandos festivos (`.navidad`, `.frase`, `.regalo`, `.arbol`, `.felicitar`, `.sorteo`).

---

## 🎮 Comandos

Los ejemplos usan el prefijo `.` (configurable con `BOT_PREFIX`). La lista completa por categoría está en [`docs/comandos.md`](docs/comandos.md).

### 🐉 Goku y Saiyajin

| Comando | Función |
|---|---|
| `.menu` | Menú principal con el tema activo |
| `.goku` · `.ki` · `.transformacion` | Saludo, lectura de ki y transformaciones |
| `.perfil` · `.nivel` | Tarjeta PNG, nivel, XP y poder |
| `.entrenar` | Gana XP y Zenis |
| `.transformar` | Transformaciones desbloqueadas |
| `.duelo @usuario` | Reta a otro jugador |
| `.ranking` | Top 10 guerreros |
| `.misiones` · `.reclamar` | Misiones y recompensas diarias |
| `.tienda` · `.comprar <id>` | Tienda de objetos |
| `.inventario` · `.shenlong` | Objetos y esferas del dragón |

### 🎴 Personajes

| Comando | Función |
|---|---|
| `.personajes` | Colección de guerreros |
| `.invocar` | Invoca un guerrero (250 Zenis) |
| `.misguerreros` | Tu colección |
| `.mejorar <id>` | Sube de nivel un personaje con fragmentos |

### 🎅 Navidad

| Comando | Función |
|---|---|
| `.evento` · `.navidad` | Cuenta regresiva y frase de la temporada |
| `.frase` | Frase navideña al azar |
| `.regalo` | Regalo sorpresa 🎁 |
| `.arbol` | Árbol navideño en texto 🎄 |
| `.felicitar <nombre>` | Felicitación personalizada |
| `.sorteo` | Elige un participante al azar en un grupo |

### 🎬 YouTube

| Comando | Función |
|---|---|
| `.yts <texto>` | Muestra 5 resultados numerados |
| `.play <texto>` | Busca y envía el audio del primer resultado |
| `.ytmp3 <texto \| link \| nº>` | Descarga el audio |
| `.ytmp4 <texto \| link \| nº>` | Descarga el video |

💡 **Truco:** después de `.yts villancicos`, usa `.ytmp3 2` o `.ytmp4 2` para elegir el resultado número 2.

El bot prueba primero YuiAPI (si hay `YUI_API_KEY`) y, si falla, usa la API multimedia (`MEDIA_API_URL`). Los archivos de más de 90 MB no se envían.

### 🌐 Herramientas YuiAPI

Usa `.menuapi` para ver la lista. Requieren `YUI_API_KEY`.

- 🔎 **Búsqueda:** `.wiki` `.anime` `.libro` `.serie` `.pais` `.paper` `.ebook` `.musica`
- 🖼️ **Imágenes:** `.imagen` `.pinterest` `.pindl <URL>`
- 🏷️ **Stickers:** `.sticker` `.stickertxt` `.rmbg`
- 🧰 **Herramientas:** `.qr` `.clima` `.cambio` `.traducir` `.hash` `.uuid` `.password`
- 👑 **Propietario:** `.plan`

### 🧰 Generales

`.ping` · `.owner`

---

## 📋 Requisitos

- Node.js **20 LTS o superior**, npm y Git.
- Una cuenta de WhatsApp para vincular el bot.
- Conexión a Internet durante la instalación y para las APIs que uses.

## 🚀 Instalación en Android (Termux)

### 1. Prepara el entorno

```bash
pkg update && pkg upgrade -y
pkg install git nodejs-lts nano -y
```

### 2. Descarga el proyecto

```bash
git clone https://github.com/AmilcarGit/GOKUBOT-MD-.git
cd GOKUBOT-MD-
```

### 3. Instala las dependencias

```bash
npm install
```

### 4. Crea tu configuración privada

```bash
cp .env.example .env
nano .env
```

Guarda en nano con **Ctrl + O**, Enter y sal con **Ctrl + X**.

### 5. Inicia el bot

```bash
npm start
```

En el primer inicio te pedirá tu número con código de país, solo dígitos (ej: `519XXXXXXXX`). Si ya pusiste `BOT_NUMBER` en `.env`, no lo pregunta.

Aparecerá un **código de vinculación**: en WhatsApp ve a **Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono** e introdúcelo. Cuando conecte, escribe `.menu`. 🎄

> ⚠️ No borres la carpeta `session/` después de vincular: guarda tu sesión.

## 💻 Instalación en PC

```bash
git clone https://github.com/AmilcarGit/GOKUBOT-MD-.git
cd GOKUBOT-MD-
npm install
```

Crea el archivo de configuración:

- **Linux / macOS / Termux:** `cp .env.example .env`
- **PowerShell:** `Copy-Item .env.example .env`
- **CMD:** `copy .env.example .env`

Edítalo y arranca con `npm start`.

## ☁️ Despliegue en Railway

Guía paso a paso en [`docs/railway.md`](docs/railway.md). Resumen:

1. **New Project → Deploy from GitHub repo**.
2. Crea un **Volume** montado en `/data`.
3. Variables: `BOT_NUMBER`, `SESSION_DIR=/data/session`, `DATA_DIR=/data/datos` y tus claves.
4. Abre los **Deploy Logs**, copia el código de vinculación y escríbelo en WhatsApp.

---

## ⚙️ Configura tu propio bot

El archivo `.env` es privado y no se sube a GitHub. En Railway estas variables van en el panel **Variables**.

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `BOT_NAME` | Nombre que muestra el bot | `MiGokuBot` |
| `BOT_CREATOR` | Nombre del creador | `TuNombre` |
| `BOT_OWNER` | Tu número (solo dígitos) | `519XXXXXXXX` |
| `BOT_NUMBER` | Número del bot para generar el código de vinculación | `519XXXXXXXX` |
| `BOT_PREFIX` | Prefijo de comandos | `.` o `!` |
| `BOT_THEME` | Tema visual (`navidad`, `clasico`) | `navidad` |
| `MENU_VIDEO` | Video que acompaña al menú | URL directa a un MP4 |
| `MEDIA_API_URL` · `MEDIA_API_KEY` | API multimedia (respaldo de YouTube) | URL y clave |
| `YUI_API_URL` · `YUI_API_KEY` | YuiAPI (YouTube, stickers, utilidades) | URL y clave |
| `SEASONS_ENABLED` | Activa o desactiva las temporadas | `true` |
| `SEASON_MODE` | `theme`, `auto` o `manual` | `theme` |
| `ACTIVE_SEASON` | Temporada fija si `SEASON_MODE=manual` | `navidad` |
| `SEASON_TIMEZONE` | Zona horaria del calendario | `America/Lima` |
| `SESSION_DIR` · `DATA_DIR` | Dónde se guardan sesión y datos (volumen en Railway) | `/data/session` |

### Ejemplo de `.env`

```env
BOT_NAME=GokuBot-MD
BOT_CREATOR=TuNombre
BOT_OWNER=519XXXXXXXX
BOT_NUMBER=519XXXXXXXX
BOT_PREFIX=.
BOT_THEME=navidad

MEDIA_API_URL=https://api-yosoyyo-api-ofc.onrender.com
MEDIA_API_KEY=

YUI_API_URL=https://yuiapi.vercel.app
YUI_API_KEY=

SEASON_MODE=theme
SEASON_TIMEZONE=America/Lima
```

Reemplaza el número y las claves por tus propios datos. Si no configuras una clave, los comandos que dependan de ese servicio avisarán que falta.

### 📅 Temporadas

- `SEASON_MODE=theme` (predeterminado): la temporada la define el tema. Con `navidad`, los comandos festivos siempre están activos.
- `SEASON_MODE=auto`: se detecta por fecha (Navidad 1–25 dic., Año Nuevo 26 dic.–5 ene., San Valentín 1–14 feb., Pascua y Halloween en octubre).
- `SEASON_MODE=manual`: fuerza la temporada de `ACTIVE_SEASON`.

---

## 🎨 Crea tu propio tema

Los temas están en la carpeta [`themes/`](themes/). Cada uno es un archivo que decide **cómo se ve** todo el bot.

1. Copia `themes/clasico.js` (plantilla simple) o `themes/navidad.js` (completo) con otro nombre, por ejemplo `themes/halloween.js`.
2. Cambia emojis, marcos (`title`, `section`, `card`), letras (`font`) y pies (`footer`).
3. Pon `season: 'halloween'` si quieres activar esa temporada junto con el tema.
4. Actívalo con `BOT_THEME=halloween` y reinicia.

Un tema exporta estas piezas:

| Pieza | Qué controla |
|---|---|
| `emoji`, `deco`, `kinds` | Emojis generales y prefijos de éxito, error, aviso y espera |
| `font(texto)` | Tipo de letra de los títulos |
| `title(texto)` | Encabezado de cada mensaje |
| `section(nombre, líneas)` | Bloques del menú |
| `card(nombre, líneas)` | Tarjetas con título, contenido y cierre |
| `msg(tipo, texto)` | Mensajes cortos de estado |
| `footer()` | Pie de los mensajes |
| `menuBanner`, `menuFooter` | Cabecera y cierre del menú |
| `season` | Temporada que activa (o `null`) |

---

## 🛠️ Personalización rápida

1. Cambia `BOT_NAME`, `BOT_CREATOR` y `BOT_PREFIX`.
2. Cambia `MENU_VIDEO` por tu propio MP4 o conserva el predeterminado.
3. Configura `BOT_OWNER` para que `.owner` muestre tu contacto.
4. Edita frases y regalos en `commands/goku/temporadas.js`.
5. Agrega comandos nuevos siguiendo [`docs/comandos.md`](docs/comandos.md#agregar-un-comando-nuevo).

## 🔄 Actualizar el bot

Antes de actualizar, conserva una copia privada de `.env` y de `session/`:

```bash
git pull origin main
npm install
npm start
```

## 🔒 Seguridad y uso responsable

- Nunca subas `.env`, `session/`, códigos de vinculación ni credenciales.
- Tu carpeta de sesión da acceso a tu cuenta de WhatsApp: no la compartas.
- Si una API key se expone, revócala en el proveedor y crea otra.
- Usa el bot respetando las condiciones de WhatsApp, Baileys, YuiAPI y los proveedores multimedia.
- Evita automatizaciones masivas o mensajes no solicitados que puedan restringir tu cuenta.
- Este proyecto no está afiliado oficialmente con WhatsApp ni con Dragon Ball.

## 📁 Estructura del proyecto

```text
GOKUBOT-MD-
├── index.js            # Conexión WhatsApp
├── config.js           # Configuración y variables de entorno
├── themes/
│   ├── navidad.js      # 🎄 Tema navideño (emojis, marcos, letras)
│   └── clasico.js      # ⚡ Tema simple / plantilla
├── commands/
│   ├── index.js        # Router: orden de comandos y tema
│   ├── menu.js         # Menú principal
│   ├── general.js      # ping, owner
│   ├── youtube.js      # yts, play, ytmp3, ytmp4
│   ├── yui.js          # Herramientas de YuiAPI
│   └── goku/
│       ├── index.js        # Goku y comandos de temporada
│       ├── temporadas.js   # Frases y regalos festivos
│       ├── rpg.js          # Motor RPG y tarjetas PNG
│       └── personajes.js   # Colección de personajes
├── lib/
│   ├── theme.js        # Carga y aplica el tema activo
│   ├── youtube.js      # Búsqueda y descarga con respaldo entre APIs
│   ├── yuiapi.js       # Cliente de YuiAPI
│   ├── message.js      # Lectura de mensajes entrantes
│   └── paths.js        # Rutas y carpeta de datos
├── scripts/check.js    # Validación de sintaxis (npm test)
├── docs/               # Guías: comandos, railway, temporadas, rpg
├── data/               # Perfiles locales (no se sube)
├── .env.example
└── session/            # Sesión privada, no subir
```

## ❓ Problemas frecuentes

**No aparece el código de vinculación**
- Revisa que el número tenga código de país y solo dígitos.
- En Railway, comprueba que exista la variable `BOT_NUMBER` y mira los *Deploy Logs*.
- Reinicia o redespliega para generar un código nuevo.

**`.yts` o las descargas no funcionan**
- Revisa `YUI_API_KEY` (y `MEDIA_API_KEY` si usas ese servicio).
- El bot prueba una API y luego la otra; los errores quedan en los logs con el prefijo `[youtube]`.
- Si el archivo supera 90 MB, WhatsApp no lo admite.

**El menú no muestra el video**
- Comprueba que `MENU_VIDEO` sea un MP4 accesible. Si no se puede descargar, el menú sale como texto.

**Quiero cambiar el estilo**
- Cambia `BOT_THEME` o edita `themes/navidad.js`. Ver [Crea tu propio tema](#-crea-tu-propio-tema).

**Quiero vincular otra cuenta**
- Detén el bot, guarda o elimina la carpeta de sesión y vuelve a iniciar con el nuevo número.

---

<div align="center">

**🎄 ❄️ ⭐ 🎁 ¡Felices fiestas, Guerrero Z! 🎁 ⭐ ❄️ 🎄**

Hecho con ❤️ por [AmilcarGit](https://github.com/AmilcarGit)

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0b3d2e,50:c0392b,100:0b3d2e&height=120&section=footer" alt="" />

</div>

## 📜 Licencia

Consulta el archivo [LICENSE](LICENSE).
