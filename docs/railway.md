# Despliegue en Railway

Railway borra el disco del contenedor en cada despliegue. Para no perder la sesión de WhatsApp ni los perfiles del RPG, hay que guardarlos en un **Volume**.

## Pasos

1. En Railway: **New Project → Deploy from GitHub repo** y elige este repositorio.
2. En el servicio, abre **Settings → Volumes → Add Volume** y móntalo en `/data`.
3. En **Variables** agrega:

| Variable | Valor |
|---|---|
| `BOT_NUMBER` | Número del bot con código de país, solo dígitos (ej: `519XXXXXXXXX`) |
| `SESSION_DIR` | `/data/session` |
| `DATA_DIR` | `/data/datos` |
| `BOT_OWNER` | Tu número (opcional) |
| `YUI_API_KEY` | Tu clave de YuiAPI (opcional) |
| `MEDIA_API_KEY` | Tu clave de la API multimedia (opcional) |

   Railway no usa archivo `.env`: las variables se configuran solo en este panel.
4. El comando de inicio es `npm start`; Railway lo detecta solo. El bot no necesita puerto ni dominio público.
5. Abre **Deployments → View logs**. En el primer arranque aparece el **código de vinculación**. En WhatsApp ve a *Dispositivos vinculados → Vincular con número de teléfono* e ingrésalo.
6. Cuando salga `✅ GokuBot-MD conectado`, la sesión queda guardada en el volumen y los siguientes despliegues no piden código.

## Importante

- No ejecutes el bot en Termux o en tu PC con la misma sesión mientras corre en Railway: WhatsApp cerrará una de las dos.
- Si el código expira antes de que lo uses, redespliega para generar otro.
- Si cierras la sesión desde el teléfono, el bot lo avisa en los logs: borra la carpeta `/data/session` y redespliega para vincular otra vez.
- Si no agregas el Volume, tendrás que vincular de nuevo en cada despliegue.
