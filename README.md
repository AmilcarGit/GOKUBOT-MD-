# GokuBot-MD

Bot de WhatsApp basado en Baileys, con comandos generales, búsquedas y descargas multimedia, utilidades de YuiAPI y comandos temáticos de Navidad.

## Requisitos

- Node.js 18 o superior
- npm
- Una cuenta de WhatsApp para vincular el bot
- Claves válidas para los servicios API que quieras utilizar

## Instalación

```bash
git clone https://github.com/AmilcarGit/GOKUBOT-MD-.git
cd GOKUBOT-MD-
npm install
cp .env.example .env
```

Edita `.env` y configura tus datos. Después inicia el bot:

```bash
npm start
```

La primera ejecución solicitará el número de WhatsApp con código de país y mostrará el código de vinculación.

## Configuración

Las variables se leen desde el entorno o desde un archivo `.env` si cargas uno con tu herramienta de ejecución. No publiques claves ni datos privados.

| Variable | Descripción |
|---|---|
| `BOT_NAME` | Nombre del bot |
| `BOT_CREATOR` | Nombre del creador |
| `BOT_OWNER` | Número del propietario, con código de país y sin `+` |
| `BOT_PREFIX` | Prefijo de comandos |
| `MENU_VIDEO` | URL del video del menú |
| `MEDIA_API_URL` | URL del servicio usado para YouTube |
| `MEDIA_API_KEY` | Clave del servicio multimedia |
| `YUI_API_URL` | URL base de YuiAPI |
| `YUI_API_KEY` | Clave de YuiAPI |
| `NAVIDAD_ENABLED` | Activa o desactiva los comandos navideños |

## Comandos principales

- `.menu`, `.ping`, `.owner`
- `.yts <texto>` / `.play <texto>`
- `.ytmp3 <texto o enlace>` / `.ytmp4 <texto o enlace>`
- `.menuapi`
- Búsquedas: `.wiki`, `.anime`, `.libro`, `.serie`, `.pais`, `.paper`, `.ebook`, `.musica`
- Imágenes: `.imagen`, `.pinterest`
- Utilidades: `.sticker`, `.stickertxt`, `.rmbg`, `.qr`, `.clima`, `.cambio`, `.traducir`, `.hash`, `.uuid`, `.password`
- Navidad: `.navidad`, `.frase`, `.regalo`, `.arbol`, `.felicitar`, `.sorteo`

Algunos comandos requieren que configures las claves de API correspondientes.

## Seguridad

- La carpeta `session/` contiene credenciales de WhatsApp y nunca debe subirse al repositorio.
- No compartas `.env`, claves API, códigos de vinculación ni archivos de sesión.
- Si una clave se publicó por accidente, revócala y genera una nueva.
- Respeta las condiciones de uso y los derechos de autor de los servicios y contenidos descargados.

## Estructura

```text
.
├── config.js
├── index.js
├── navidad.js
├── yui.js
├── package.json
└── .env.example
```

## Licencia

Consulta el archivo [LICENSE](LICENSE).
