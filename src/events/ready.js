import { Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), 'utf8'));

export default {
    name: Events.ClientReady,
    once: true,
    
    async execute(client) {
        try {
            console.log('\n' + '='.repeat(50));
            console.log(`🤖 ${config.botName} está en línea!`);
            console.log(`👤 Conectado como: ${client.user.tag}`);
            console.log(`🆔 ID del bot: ${client.user.id}`);
            console.log(`🌐 Servidores conectados: ${client.guilds.cache.size}`);
            console.log(`👥 Usuarios totales: ${client.users.cache.size}`);
            console.log(`📝 Comandos cargados: ${client.commands.size}`);
            console.log(`📅 Fecha de inicio: ${new Date().toLocaleString('es-ES')}`);
            console.log('='.repeat(50) + '\n');
            
            // Establecer el estado del bot
            client.user.setActivity(`${config.botName} v${config.version}`, { 
                type: 'WATCHING' 
            });
            
            // Opcional: Mostrar información adicional sobre los servidores
            if (client.guilds.cache.size > 0) {
                console.log('📋 Servidores conectados:');
                client.guilds.cache.forEach(guild => {
                    console.log(`   • ${guild.name} (${guild.memberCount} miembros)`);
                });
                console.log('');
            }
            
        } catch (error) {
            console.error('❌ Error en el evento ready:', error);
        }
    },
};