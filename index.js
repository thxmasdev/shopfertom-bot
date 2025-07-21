import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import axios from 'axios';
import { loadCommands } from './src/handlers/commandHandler.js';
import { loadEvents } from './src/handlers/eventHandler.js';
import { initDatabase, getActiveAuctions } from './src/database/database.js';
import { loadActiveAuctions } from './src/handlers/auctionHandler.js';
import { loadActiveGiveaways } from './src/handlers/giveawayHandler.js';

// Configurar variables de entorno
dotenv.config();

// Crear cliente de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ]
});

// Función principal para inicializar el bot
async function initializeBot() {
    try {
        console.log('🚀 Iniciando bot...');
        
        // Inicializar base de datos
        await initDatabase();
        
        // Cargar comandos usando el handler
        await loadCommands(client);
        
        // Cargar eventos usando el handler
        await loadEvents(client);
        
        // Cargar subastas y sorteos activos después de que el bot esté listo
        client.once('ready', async () => {
            console.log('🔄 Cargando subastas activas...');
            await loadActiveAuctions(client);
            console.log('✅ Subastas activas cargadas');
            
            console.log('🔄 Cargando sorteos activos...');
            await loadActiveGiveaways(client);
            console.log('✅ Sorteos activos cargados');
        });
        
        // Verificar que el token esté presente
        if (!process.env.DISCORD_TOKEN) {
            console.error('❌ Token de Discord no encontrado. Verifica tu archivo .env');
            process.exit(1);
        }
        
        // Iniciar sesión con Discord
        await client.login(process.env.DISCORD_TOKEN);
        
        // Sistema de ping automático para evitar que el bot se duerma en Railway
        cron.schedule('*/5 * * * *', () => {
            axios.get('https://google.com')
                .then(() => console.log('✅ Ping enviado (bot activo)'))
                .catch(() => console.log('⚠️ Ping falló, pero el bot sigue vivo'));
        });
        
        console.log('🔄 Sistema de ping automático activado (cada 5 minutos)');
        
    } catch (error) {
        console.error('❌ Error al inicializar el bot:', error);
        process.exit(1);
    }
}

// Manejar errores no capturados
process.on('unhandledRejection', error => {
    console.error('❌ Promesa rechazada no manejada:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Excepción no capturada:', error);
    process.exit(1);
});

// Inicializar el bot
initializeBot();