# 🤖 Discord Bot - ShopFertom

Bot de Discord modular y escalable construido con Discord.js v14 especializado en gestión de tiendas, subastas y sistema de vouchers. Este bot utiliza una arquitectura basada en comandos y eventos para facilitar el mantenimiento y la expansión.

## 📋 Características Principales

### 🏪 Sistema de Tienda
- ✅ **Comando `/venta`** - Crear publicaciones de venta con galería de medios
- ✅ **Comando `/ventaoffer`** - Crear subastas con sistema de ofertas
- ✅ **Galería de medios** - Visualización de imágenes, videos y GIFs en alta calidad
- ✅ **Sistema de vouchers** - Gestión de reputación y testimonios
- ✅ **Renders 3D automáticos** - Generación de avatares de Minecraft

### 🔧 Características Técnicas
- ✅ **Estructura modular** con comandos y eventos separados
- ✅ **Comandos de barra (/)** usando la API de interacciones de Discord
- ✅ **Carga dinámica** de comandos y eventos
- ✅ **Base de datos SQLite** integrada
- ✅ **Sistema de ping automático** para prevenir inactividad en Railway.app
- ✅ **Manejo de errores** robusto
- ✅ **Configuración mediante archivos** `.env` y `config.json`
- ✅ **Compatible con Node.js 16.9.0+**
- ✅ **Módulos ES** para mejor rendimiento
- ✅ **Mensajes efímeros** para mejor privacidad

## 🚀 Instalación

### Prerrequisitos

- Node.js 16.9.0 o superior
- npm o yarn
- Una aplicación de Discord creada en el [Portal de Desarrolladores](https://discord.com/developers/applications)

### Pasos de instalación

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/thxmasdev/shopfertom-bot.git
   cd shopfertom-bot
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   - Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   - Edita el archivo `.env` y completa los valores:
   ```env
   DISCORD_TOKEN=tu_token_del_bot
   CLIENT_ID=tu_client_id
   GUILD_ID=tu_guild_id_opcional
   ```

4. **Configura el bot en Discord**
   - Ve al [Portal de Desarrolladores de Discord](https://discord.com/developers/applications)
   - Crea una nueva aplicación o selecciona una existente
   - Ve a la sección "Bot" y copia el token
   - Ve a la sección "General Information" y copia el Application ID (CLIENT_ID)

5. **Invita el bot a tu servidor**
   - Ve a la sección "OAuth2" > "URL Generator"
   - Selecciona los scopes: `bot` y `applications.commands`
   - Selecciona los permisos necesarios:
     - View Channels
     - Send Messages
     - Use Slash Commands
     - Embed Links
     - Attach Files
     - Read Message History
   - Usa la URL generada para invitar el bot

6. **Despliega los comandos**
   ```bash
   npm run deploy
   ```

7. **Inicia el bot**
   ```bash
   npm start
   ```

## 📁 Estructura del proyecto

```
shopfertom-bot/
├── src/                    # Código fuente
│   ├── commands/          # Comandos del bot
│   │   ├── admin/         # Comandos de administración
│   │   │   ├── venta.js   # Sistema de ventas con galería
│   │   │   └── ventaoffer.js # Sistema de subastas
│   │   └── public/        # Comandos públicos
│   │       ├── about.js   # Información del bot
│   │       ├── ping.js    # Comando de ping
│   │       ├── serverinfo.js # Información del servidor
│   │       ├── userinfo.js   # Información de usuarios
│   │       ├── vouchme.js    # Sistema de vouchers
│   │       └── vouches.js    # Ver vouchers de usuario
│   ├── database/          # Gestión de base de datos
│   │   └── database.js    # Configuración SQLite
│   ├── events/            # Eventos del bot
│   │   ├── ready.js       # Evento cuando el bot está listo
│   │   ├── interactionCreate.js # Manejo de interacciones
│   │   ├── error.js       # Manejo de errores
│   │   └── guild/         # Eventos de servidor
│   │       └── guildMemberAdd.js # Nuevos miembros
│   └── handlers/          # Manejadores del sistema
│       ├── auctionHandler.js  # Gestión de subastas
│       ├── commandHandler.js  # Carga de comandos
│       ├── eventHandler.js    # Carga de eventos
│       └── giveawayHandler.js # Gestión de sorteos
├── config.json            # Configuración global
├── database.sqlite        # Base de datos SQLite
├── deploy-commands.js     # Script para desplegar comandos
├── index.js              # Punto de entrada principal
├── ping-example.js        # Ejemplo de sistema de ping
├── package.json          # Dependencias y scripts
├── .env.example          # Plantilla de variables de entorno
├── .env                  # Variables de entorno (no incluir en git)
├── .gitignore            # Archivos a ignorar en git
└── README.md             # Este archivo
```

## 🔧 Configuración

### Variables de entorno (.env)

El archivo `.env.example` contiene todas las variables necesarias. Cópialo a `.env` y completa los valores:

```env
# Discord Bot Configuration
# Token del bot (REQUERIDO)
# Obtén esto desde https://discord.com/developers/applications
DISCORD_TOKEN=tu_token_aqui

# ID de la aplicación (REQUERIDO)
# Obtén esto desde https://discord.com/developers/applications
CLIENT_ID=tu_client_id_aqui

# ID del servidor para comandos específicos (OPCIONAL)
# Úsalo para desarrollo más rápido
# Si no se especifica, los comandos se despliegan globalmente (tarda hasta 1 hora)
GUILD_ID=tu_guild_id_aqui
```

### Configuración global (config.json)

Puedes modificar `config.json` para personalizar:
- Prefijo del bot
- Color de embeds
- Información del bot
- Permisos requeridos

## 🎮 Comandos Disponibles

### 🏪 Comandos de Tienda (Admin)
- `/venta` - Crear publicación de venta con galería de medios
  - Soporte para múltiples imágenes, videos y GIFs
  - Galería interactiva con visualización en alta calidad
  - Renders 3D automáticos para usuarios de Minecraft
  - Sistema de vouchers integrado

- `/ventaoffer` - Crear subasta con sistema de ofertas
  - Duración personalizable de la subasta
  - Sistema de ofertas en tiempo real
  - Galería de medios integrada
  - Notificaciones automáticas

### 👥 Comandos Públicos
- `/ping` - Verificar latencia del bot
- `/about` - Información sobre el bot
- `/serverinfo` - Información del servidor
- `/userinfo` - Información de un usuario
- `/vouchme` - Solicitar vouch a otro usuario
- `/vouches` - Ver vouches de un usuario

### 🔧 Características Especiales
- **Galería de medios**: Visualización directa de imágenes, videos y GIFs
- **Sistema de vouchers**: Gestión de reputación entre usuarios
- **Renders 3D**: Generación automática de avatares de Minecraft
- **Mensajes efímeros**: Mayor privacidad en las interacciones
- **Base de datos**: Persistencia de datos con SQLite

## 📝 Scripts disponibles

- `npm start` - Inicia el bot
- `npm run dev` - Inicia el bot en modo desarrollo (con watch)
- `npm run deploy` - Despliega los comandos a Discord

## 🆕 Agregar nuevos comandos

### Comando en la carpeta principal
1. **Crea un nuevo archivo en `src/commands/`**
   ```javascript
   // src/commands/ejemplo.js
   import { SlashCommandBuilder } from 'discord.js';
   
   export default {
       data: new SlashCommandBuilder()
           .setName('ejemplo')
           .setDescription('Descripción del comando'),
       
       async execute(interaction) {
           await interaction.reply('¡Hola mundo!');
       },
   };
   ```

### Comando en subcarpeta (organización por categorías)
1. **Crea una subcarpeta y el archivo**
   ```javascript
   // src/commands/moderation/ban.js
   import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
   
   export default {
       data: new SlashCommandBuilder()
           .setName('ban')
           .setDescription('Banea a un usuario')
           .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
       
       async execute(interaction) {
           // Lógica del comando
       },
   };
   ```

2. **Despliega los comandos**
   ```bash
   npm run deploy
   ```

3. **Reinicia el bot**
   ```bash
   npm start
   ```

> 💡 **Tip**: El sistema detecta automáticamente comandos en cualquier subcarpeta dentro de `src/commands/`

## 🎯 Agregar nuevos eventos

### Evento en la carpeta principal
1. **Crea un nuevo archivo en `src/events/`**
   ```javascript
   // src/events/messageCreate.js
   import { Events } from 'discord.js';
   
   export default {
       name: Events.MessageCreate,
       
       async execute(message) {
           if (message.author.bot) return;
           console.log(`Mensaje de ${message.author.tag}: ${message.content}`);
       },
   };
   ```

### Evento en subcarpeta (organización por categorías)
1. **Crea una subcarpeta y el archivo**
   ```javascript
   // src/events/guild/guildMemberRemove.js
   import { Events } from 'discord.js';
   
   export default {
       name: Events.GuildMemberRemove,
       
       async execute(member) {
           console.log(`${member.user.tag} abandonó el servidor`);
       },
   };
   ```

2. **Reinicia el bot** para cargar el nuevo evento

> 💡 **Tip**: El sistema detecta automáticamente eventos en cualquier subcarpeta dentro de `src/events/`

## 🔄 Escalabilidad

### Base de datos
Para agregar persistencia de datos:

1. **Instala un ORM o driver de base de datos**
   ```bash
   npm install mongoose  # Para MongoDB
   # o
   npm install sqlite3   # Para SQLite
   ```

2. **Crea una carpeta `models/` para esquemas**
3. **Inicializa la conexión en `index.js`**

### Sharding
Para bots en más de 2,500 servidores:

1. **Crea un archivo `shard.js`**
   ```javascript
   import { ShardingManager } from 'discord.js';
   
   const manager = new ShardingManager('./index.js', {
       token: process.env.DISCORD_TOKEN,
   });
   
   manager.spawn();
   ```

2. **Modifica el script de inicio en `package.json`**

### Comandos con subcategorías (Ya implementado)
```
src/commands/
├── ping.js              # Comando básico
├── serverinfo.js        # Información del servidor
├── userinfo.js          # Información de usuarios
├── admin/               # Comandos de administración
│   └── test.js         # Comando de prueba
├── moderation/          # Comandos de moderación
│   ├── ban.js
│   ├── kick.js
│   └── warn.js
├── utility/             # Comandos de utilidad
│   ├── avatar.js
│   └── weather.js
└── fun/                 # Comandos de diversión
    ├── meme.js
    └── joke.js
```

### Eventos con subcategorías (Ya implementado)
```
src/events/
├── ready.js             # Bot listo
├── interactionCreate.js # Manejo de interacciones
├── error.js            # Manejo de errores
├── guild/              # Eventos de servidor
│   ├── guildMemberAdd.js
│   ├── guildMemberRemove.js
│   └── guildCreate.js
├── message/            # Eventos de mensajes
│   ├── messageCreate.js
│   └── messageDelete.js
└── voice/              # Eventos de voz
    ├── voiceStateUpdate.js
    └── voiceChannelJoin.js
```

## 🛠️ Solución de problemas

### El bot no responde a comandos
1. Verifica que los comandos estén desplegados: `npm run deploy`
2. Asegúrate de que el bot tenga permisos `applications.commands`
3. Revisa los logs en la consola

### Error de token inválido
1. Verifica que el token en `.env` sea correcto
2. Asegúrate de que no haya espacios extra
3. Regenera el token en el Portal de Desarrolladores si es necesario

### Comandos no aparecen en Discord
- Los comandos de servidor aparecen inmediatamente
- Los comandos globales pueden tardar hasta 1 hora
- Usa `GUILD_ID` para desarrollo más rápido

## 📄 Licencia

MIT License - Consulta el archivo LICENSE para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🚀 Despliegue en Railway.app

Este bot incluye un sistema de ping automático para prevenir la inactividad en Railway.app:

1. **Conecta tu repositorio** a Railway.app
2. **Configura las variables de entorno** en el dashboard de Railway
3. **El bot se mantendrá activo** automáticamente con el sistema de ping cada 5 minutos

### Variables de entorno en Railway:
```
DISCORD_TOKEN=tu_token_real
CLIENT_ID=tu_client_id_real
GUILD_ID=tu_guild_id_opcional
```

## 🛠️ Dependencias Principales

- **discord.js** v14 - Librería principal de Discord
- **sqlite3** - Base de datos local
- **axios** - Cliente HTTP para requests
- **node-cron** - Sistema de tareas programadas
- **dotenv** - Gestión de variables de entorno

## 📞 Soporte y Contacto

Si tienes problemas, preguntas, errores que reportar, o necesitas agregar nuevas funcionalidades:

### 📱 Contacto Directo
- **Discord**: `thxmasdev`
- **Twitter/X**: `@thxmasdev`

### 📚 Recursos Adicionales
1. Revisa la documentación de [Discord.js](https://discord.js.org/)
2. Consulta los [ejemplos oficiales](https://github.com/discordjs/discord.js/tree/main/apps/guide)
3. Abre un issue en este repositorio
4. Contacta directamente para soporte personalizado