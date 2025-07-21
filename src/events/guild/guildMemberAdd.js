import { Events, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'config.json'), 'utf8'));

export default {
    name: Events.GuildMemberAdd,
    
    async execute(member) {
        try {
            console.log(`👋 ${member.user.tag} se unió al servidor ${member.guild.name}`);
            
            // Buscar un canal de bienvenida (puedes personalizar esto)
            const welcomeChannel = member.guild.channels.cache.find(
                channel => channel.name.includes('bienvenida') || 
                          channel.name.includes('welcome') ||
                          channel.name.includes('general')
            );
            
            if (welcomeChannel && welcomeChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle('¡Bienvenido al servidor!')
                    .setDescription(`¡Hola ${member}! Bienvenido a **${member.guild.name}**`)
                    .setColor(config.embedColor)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        {
                            name: '👤 Miembro',
                            value: `${member.user.tag}`,
                            inline: true
                        },
                        {
                            name: '📅 Cuenta creada',
                            value: member.user.createdAt.toLocaleDateString('es-ES'),
                            inline: true
                        },
                        {
                            name: '📊 Miembros totales',
                            value: `${member.guild.memberCount}`,
                            inline: true
                        }
                    )
                    .setFooter({
                        text: `${config.botName} - Sistema de Bienvenida`,
                        iconURL: member.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();
                
                await welcomeChannel.send({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('❌ Error en el evento guildMemberAdd:', error);
        }
    },
};