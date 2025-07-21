import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra información de un usuario')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('El usuario del que quieres ver la información')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            // Obtener el usuario objetivo (el mencionado o el que ejecuta el comando)
            const user = interaction.options.getUser('usuario') || interaction.user;
            const member = interaction.guild?.members.cache.get(user.id);
            
            // Calcular tiempo desde la creación de la cuenta
            const createdDate = user.createdAt.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Crear embed con la información del usuario
            const embed = new EmbedBuilder()
                .setTitle(user.tag)
                .setDescription(`Cuenta creada ${createdDate}`)
                .setColor('#2F3136')
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));

            // Si es un miembro del servidor, agregar información adicional
            if (member) {
                const joinedDate = member.joinedAt ? member.joinedAt.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Desconocido';

                embed.setDescription(`Se unió ${joinedDate} • Cuenta creada ${createdDate}`);
                
                embed.addFields(
                    {
                        name: 'Apodo',
                        value: member.nickname || 'Sin apodo',
                        inline: true
                    },
                    {
                        name: 'Rol más alto',
                        value: member.roles.highest.name,
                        inline: true
                    }
                );
            }

            embed.setFooter({ text: 'ShopFertom', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error en el comando userinfo:', error);
            
            const errorMessage = {
                content: '❌ Ocurrió un error al obtener la información del usuario.',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
};