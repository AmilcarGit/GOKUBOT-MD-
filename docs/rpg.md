# 🐉 Sistema Saiyajin RPG

El RPG funciona localmente y no necesita APIs externas ni servicios de base de datos.

## Comandos

- `.perfil`: genera y envía una tarjeta PNG personalizada.
- `.nivel`: nivel, XP, poder y siguiente transformación.
- `.entrenar`: gana XP y Zenis; tiene enfriamiento de 30 segundos.
- `.transformar`: consulta las transformaciones desbloqueadas.
- `.duelo @usuario`: combate entre dos perfiles; enfriamiento de 60 segundos.
- `.ranking`: top 10 por poder de combate.
- `.misiones`: objetivos diarios.
- `.tienda`: catálogo de objetos.
- `.comprar <id>`: compra un objeto.
- `.inventario`: objetos y esferas reunidas.
- `.shenlong`: canjea las siete esferas por una recompensa.

## Datos y privacidad

Los perfiles se guardan en `data/players.json`. El archivo se crea automáticamente al usar el sistema y queda excluido de Git. Cada usuario se identifica por su JID de WhatsApp; el nombre visible solo se utiliza como etiqueta.

La tarjeta se dibuja como PNG con módulos nativos de Node.js (`zlib` y `fs`). No usa una API de imágenes ni añade dependencias externas.

## Balance inicial

- 100 Zenis al crear un perfil.
- Entrenamiento: 35–60 XP y 15–30 Zenis.
- Probabilidad del 22% de encontrar una esfera nueva al entrenar.
- Duelo ganado: 80 Zenis y 45 XP.
- Deseo de Shenlong: 1000 Zenis y 250 XP.
- Nivel máximo: 100.

Los tiempos de enfriamiento son básicos y se guardan en el perfil local. No son un sistema antitrampas distribuido: en instalaciones con varios procesos, usa una única instancia del bot.
