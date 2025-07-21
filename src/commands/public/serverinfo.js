import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Muestra información detallada del servidor'),
    
    async execute(interaction) {
        try {
            // Verificar si el comando se ejecuta en un servidor
            if (!interaction.guild) {
                return await interaction.reply({
                    content: '❌ Este comando solo puede usarse en un servidor.',
                    ephemeral: true
                });
            }
            
            const guild = interaction.guild;
            
            // Obtener información del servidor
            const owner = await guild.fetchOwner();
            const createdDate = guild.createdAt.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Contar canales por tipo
            const channels = guild.channels.cache;
            const textChannels = channels.filter(channel => channel.type === 0).size;
            const voiceChannels = channels.filter(channel => channel.type === 2).size;
            const categories = channels.filter(channel => channel.type === 4).size;
            
            // Contar miembros por estado
            const members = guild.members.cache;
            const onlineMembers = members.filter(member => member.presence?.status === 'online').size;
            const bots = members.filter(member => member.user.bot).size;
            const humans = members.filter(member => !member.user.bot).size;
            
            // Crear embed con la información
            const embed = new EmbedBuilder()
                .setTitle(guild.name)
                .setDescription(`**${guild.memberCount}** miembros • **${channels.size}** canales • Creado ${createdDate}`)
                .setColor('#2F3136')
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: 'Propietario',
                        value: owner.user.tag,
                        inline: true
                    },
                    {
                        name: 'Boost Level',
                        value: `${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`,
                        inline: true
                    }
                )
                .setFooter({ text: 'ShopFertom', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error en el comando serverinfo:', error);
            
            const errorMessage = {
                content: '❌ Ocurrió un error al obtener la información del servidor.',
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