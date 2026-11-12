# 🐉 GokuBot-MD — Saiyan Xmas 🎄

Bot de WhatsApp construido con Node.js y Baileys. Combina comandos de Goku, un modo navideño y utilidades multimedia mediante YuiAPI.

> **Crea tu propia instancia:** instala el proyecto, vincula tu propio número de WhatsApp, configura tus claves y personaliza el nombre, prefijo y menú.

## ✨ Características

- 🐉 Comandos temáticos de Goku y transformaciones Saiyajin.
- 🎄 Comandos navideños: cuenta regresiva, frases, regalos, árbol y sorteos.
- 🎬 Búsqueda y descarga multimedia de YouTube.
- 🌐 Herramientas de YuiAPI: búsquedas, stickers, QR, clima, conversión, traducción y más.
- 📱 Compatible con Termux en Android y con PC.
- ⚙️ Configuración mediante variables de entorno en `.env`.
- 🔐 Sesión y claves privadas fuera del repositorio mediante `.gitignore`.

## 📋 Requisitos

- Node.js **20 LTS o superior**.
- npm (se instala junto con Node.js).
- Git.
- Una cuenta de WhatsApp para vincular el bot.
- Conexión a Internet durante la instalación y para los servicios/API que utilices.

## 🚀 Instalación en Android (Termux)

### 1. Instala Termux y prepara el entorno

Se recomienda instalar Termux desde una fuente oficial y mantenerlo actualizado. Abre Termux y ejecuta:

```bash
pkg update && pkg upgrade -y
pkg install git nodejs-lts nano -y
```

Comprueba las versiones:

```bash
node -v
npm -v
git --version
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

Completa los valores que necesites. Guarda en nano con **Ctrl + O**, Enter y sal con **Ctrl + X**.

### 5. Inicia el bot

```bash
npm start
```

En el primer inicio, el programa solicitará tu número de WhatsApp con código de país, sin espacios ni el signo `+`. Ejemplo de formato: `519XXXXXXXX`.

A continuación aparecerá un código de vinculación. En WhatsApp, abre **Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono** e introduce el código.

Cuando la conexión se complete, el bot estará activo. Envía `.menu` desde otra cuenta o desde un chat permitido para ver los comandos.

**Importante:** no borres la carpeta `session/` después de vincularlo. Contiene la sesión para que el bot pueda volver a conectarse sin pedir un nuevo código.

## 💻 Instalación en PC

Instala Node.js 20 LTS o superior y Git. Luego abre una terminal (PowerShell, CMD, Terminal de macOS o Linux) y ejecuta:

```bash
git clone https://github.com/AmilcarGit/GOKUBOT-MD-.git
cd GOKUBOT-MD-
npm install
```

Crea el archivo de configuración:

- **Linux / macOS / Termux:** `cp .env.example .env`
- **PowerShell:** `Copy-Item .env.example .env`
- **CMD:** `copy .env.example .env`

Edita `.env` con un editor de texto y arranca:

```bash
npm start
```

Completa la vinculación de WhatsApp con el código que aparece en la terminal.

## ⚙️ Configura tu propio bot

El archivo `.env` es privado y no se sube a GitHub. Estas son las variables disponibles:

| Variable | Para qué sirve | Valor de ejemplo |
|---|---|---|
| `BOT_NAME` | Nombre que muestra el bot | `MiGokuBot` |
| `BOT_CREATOR` | Nombre del creador | `TuNombre` |
| `BOT_OWNER` | Tu número con código de país, solo dígitos | `519XXXXXXXX` |
| `BOT_PREFIX` | Prefijo de comandos | `.` o `!` |
| `MENU_VIDEO` | Video que acompaña al menú | `https://files.catbox.moe/nc2k5n.mp4` |
| `MEDIA_API_URL` | Servicio multimedia usado por los comandos principales | URL base del proveedor |
| `MEDIA_API_KEY` | Clave del servicio multimedia, si el proveedor la requiere | Tu clave privada |
| `YUI_API_URL` | URL base de YuiAPI | `https://yuiapi.vercel.app` |
| `YUI_API_KEY` | Clave necesaria para los comandos de YuiAPI | Tu clave privada |
| `NAVIDAD_ENABLED` | Activa o desactiva el módulo navideño | `true` / `false` |

### Ejemplo de archivo .env

```env
BOT_NAME=GokuBot-MD
BOT_CREATOR=TuNombre
BOT_OWNER=519XXXXXXXX
BOT_PREFIX=.
MENU_VIDEO=https://files.catbox.moe/nc2k5n.mp4

MEDIA_API_URL=https://api-yosoyyo-api-ofc.onrender.com
MEDIA_API_KEY=

YUI_API_URL=https://yuiapi.vercel.app
YUI_API_KEY=

NAVIDAD_ENABLED=true
```

Reemplaza el número y las claves por tus propios datos. No copies claves privadas de otras personas. Si no configuras una clave, los comandos que dependan de ese servicio pueden responder con un aviso de configuración pendiente.

## 🎮 Comandos

Usa el prefijo que hayas configurado. Con el valor predeterminado, todos los ejemplos comienzan con punto.

### 🐉 Goku / Saiyajin

| Comando | Función |
|---|---|
| `.goku` | Saludo temático de Goku |
| `.ki` | Lectura de ki ficticia y recreativa |
| `.transformacion` | Muestra transformaciones Saiyajin |

### 🎄 Navidad

| Comando | Función |
|---|---|
| `.navidad` | Cuenta regresiva y frase navideña |
| `.frase` | Frase aleatoria |
| `.regalo` | Regalo sorpresa |
| `.arbol` | Árbol navideño en texto |
| `.felicitar <nombre>` | Felicitación personalizada |
| `.sorteo` | Elige un participante al azar en un grupo |

Para desactivar el módulo navideño, cambia `NAVIDAD_ENABLED=false` en `.env`. Los comandos Saiyajin permanecen disponibles.

### 🎬 YouTube y multimedia

| Comando | Función |
|---|---|
| `.yts <texto>` | Busca videos en YouTube |
| `.play <texto>` | Alias de búsqueda |
| `.ytmp3 <texto o URL>` | Solicita audio |
| `.ytmp4 <texto o URL>` | Solicita video |

### 🌐 Herramientas YuiAPI

Consulta `.menuapi` en WhatsApp para ver la lista integrada. Entre los comandos disponibles están:

- Búsqueda: `.wiki`, `.anime`, `.libro`, `.serie`, `.pais`, `.paper`, `.ebook`, `.musica`.
- Imágenes: `.imagen`, `.pinterest`.
- Stickers: `.sticker`, `.stickertxt`, `.rmbg`.
- Herramientas: `.qr`, `.clima`, `.cambio`, `.traducir`, `.hash`, `.uuid`, `.password`.
- Descargas: `.pindl <URL>`.
- Administración: `.plan` (solo propietario).

Los comandos de YuiAPI requieren una clave válida en `YUI_API_KEY`. Las funciones multimedia principales también pueden requerir que configures el proveedor y la clave correspondientes.

### 🧰 Comandos generales

- `.menu` — muestra el menú.
- `.ping` — comprueba la respuesta del bot.
- `.owner` — muestra el contacto configurado como propietario.

## 🛠️ Personalización básica

1. Cambia `BOT_NAME`, `BOT_CREATOR` y `BOT_PREFIX` en `.env`.
2. Cambia `MENU_VIDEO` por una URL directa a tu propio video MP4 o conserva el video predeterminado.
3. Configura `BOT_OWNER` para que el comando `.owner` muestre tu contacto.
4. Añade tus comandos en `index.js` o crea un módulo JavaScript separado siguiendo el patrón de `navidad.js` y `yui.js`.
5. Reinicia el proceso con `npm start` para aplicar los cambios.

## 🔄 Actualizar el bot

Antes de actualizar, conserva una copia privada de tu archivo `.env` y de la carpeta `session/`. Después:

```bash
git pull origin main
npm install
npm start
```

No compartas ni subas la copia de seguridad de tu sesión.

## 🔒 Seguridad y uso responsable

- Nunca subas `.env`, `session/`, códigos de vinculación ni credenciales.
- No compartas tu carpeta de sesión: permite acceder a tu cuenta de WhatsApp.
- Si una API key se expone, revócala en el proveedor y crea otra.
- Usa el bot respetando las condiciones de WhatsApp, Baileys, YuiAPI y los proveedores multimedia.
- Evita automatizaciones masivas o mensajes no solicitados que puedan provocar restricciones en tu cuenta.
- Este proyecto no está afiliado oficialmente con WhatsApp ni con Dragon Ball.

## 📁 Estructura del proyecto

```text
GOKUBOT-MD-
├── config.js       # Lee la configuración y el archivo .env
├── index.js        # Conexión WhatsApp y comandos principales
├── navidad.js      # Módulo Saiyajin / Navidad
├── yui.js          # Integración de comandos YuiAPI
├── package.json    # Dependencias y script de inicio
├── .env.example   # Plantilla de configuración
├── .gitignore     # Excluye secretos y sesión
└── session/        # Se crea al vincular; no subir a GitHub
```

## ❓ Problemas frecuentes

**No aparece el código de vinculación**
- Comprueba que el número tenga el código de país y solo contenga dígitos.
- Verifica que WhatsApp permita vincular otro dispositivo.
- Cierra el proceso y vuelve a ejecutar `npm start`.

**El bot no encuentra un comando de YuiAPI**
- Revisa que `YUI_API_KEY` esté configurada correctamente.
- Comprueba que la clave siga activa y que el proveedor esté disponible.
- Ejecuta `.menuapi` para consultar los comandos integrados.

**El menú no muestra el video**
- Comprueba que `MENU_VIDEO` apunte a un archivo MP4 accesible directamente.
- Si el video no se puede descargar, el bot debe mostrar el menú como texto.

**Quiero vincular otra cuenta**
- Detén el bot y guarda la sesión actual en un lugar privado.
- Elimina o mueve `session/` solo si deseas desvincular esa instancia.
- Inicia de nuevo y vincula el nuevo número.

## 📜 Licencia

Consulta el archivo [LICENSE](LICENSE).
