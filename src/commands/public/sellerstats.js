import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getSellerVouchStats, getServerConfig } from '../../database/database.js';
import dotenv from 'dotenv';

dotenv.config();

const data = new SlashCommandBuilder()
    .setName('sellerstats')
    .setDescription('Muestra las estadísticas de vouches de un vendedor específico')
    .addUserOption(option =>
        option.setName('vendedor')
            .setDescription('El vendedor del cual quieres ver las estadísticas')
            .setRequired(true)
    );

async function execute(interaction) {
    try {
        // Obtener configuración del servidor
        const serverConfig = await getServerConfig(interaction.guild.id);
        const sellerRoleId = serverConfig?.seller_role_id;
        if (!sellerRoleId) {
            return await interaction.reply({
                content: '❌ Error de configuración: ID del rol de vendedor no configurado.',
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('vendedor');
        
        // Verificar si el usuario objetivo tiene el rol de vendedor
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember || !targetMember.roles.cache.has(sellerRoleId)) {
            return await interaction.reply({
                content: `❌ ${targetUser.displayName} no es un vendedor autorizado. Solo se pueden consultar estadísticas de vendedores.`,
                ephemeral: true
            });
        }
        
        // Obtener estadísticas del vendedor específico
        const sellerStats = await getSellerVouchStats(targetUser.id);
        
        // Generar display de estrellas
        const starsDisplay = generateStarsDisplay(sellerStats.averageRating);
        
        // Crear embed de estadísticas del vendedor
        const statsEmbed = new EmbedBuilder()
            .setTitle(`Estadísticas de ${targetUser.displayName}`)
            .setDescription(`${starsDisplay} **${sellerStats.averageRating.toFixed(1)}/5.0** • ${sellerStats.totalVouches} vouch${sellerStats.totalVouches !== 1 ? 's' : ''}`)
            .setColor('#2F3136')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                {
                    name: 'Confianza',
                    value: `${getConfidenceLevel(sellerStats.totalVouches)} basado en ${sellerStats.totalVouches} evaluacion${sellerStats.totalVouches !== 1 ? 'es' : ''}`,
                    inline: false
                }
            )
            .setFooter({ text: 'ShopFertom', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({
            embeds: [statsEmbed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Error en comando sellerstats:', error);
        await interaction.reply({
            content: '❌ Hubo un error al obtener las estadísticas del vendedor.',
            ephemeral: true
        });
    }
}

// Función para generar display de estrellas
function generateStarsDisplay(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '⭐'.repeat(fullStars);
    if (hasHalfStar) stars += '✨';
    stars += '☆'.repeat(emptyStars);
    
    return stars;
}

// Función para obtener el nivel de confianza basado en el número de evaluaciones
function getConfidenceLevel(totalVouches) {
    if (totalVouches === 0) return '**Sin datos**';
    if (totalVouches < 3) return '**Baja confianza**';
    if (totalVouches < 10) return '**Confianza moderada**';
    if (totalVouches < 25) return '**Alta confianza**';
    return '**Máxima confianza**';
}

export default {
    data,
    execute
};