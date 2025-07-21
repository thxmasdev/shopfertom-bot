import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

export default {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Muestra información sobre el bot, su owner y desarrollador'),

    async execute(interaction) {
        try {
            // Obtener el owner del bot desde el .env
            const ownerId = process.env.OWNER_ID;
            let ownerInfo = 'No configurado';
            
            if (ownerId && ownerId !== 'YOUR_DISCORD_ID_HERE') {
                try {
                    const owner = await interaction.client.users.fetch(ownerId);
                    ownerInfo = `${owner.tag} (${owner.id})`;
                } catch (error) {
                    ownerInfo = `ID: ${ownerId} (Usuario no encontrado)`;
                }
            }

            // Información del desarrollador (puedes cambiar estos datos)
            const developerInfo = {
                name: 'Tu Nombre Discord',
                id: 'TU_ID_AQUI',
                tag: 'TuNombre#1234'
            };

            // Crear embed con información del bot
            const aboutEmbed = new EmbedBuilder()
                .setTitle('🤖 Información del Bot')
                .setDescription('Bot de Discord para gestión de tienda y sistema de vouches')
                .setColor('#2F3136')
                .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
                .addFields(
                    {
                        name: '👨‍💻 Desarrollado por',
                        value: ownerInfo,
                        inline: false
                    },
                    {
                        name: '📊 Estadísticas',
                        value: `**Servidores:** ${interaction.client.guilds.cache.size}\n**Usuarios:** ${interaction.client.users.cache.size}\n**Comandos:** ${interaction.client.commands.size}`,
                        inline: true
                    },
                    {
                        name: '🔧 Versión',
                        value: `v1.0.0\nNode.js ${process.version}`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: 'ShopFertom Bot • Desarrollado con Discord.js', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [aboutEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error en comando about:', error);
            
            const errorMessage = {
                content: '❌ Hubo un error al mostrar la información del bot.',
                ephemeral: true
            };
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            } catch (followUpError) {
                console.error('❌ Error al enviar mensaje de error:', followUpError);
            }
        }
    }
};