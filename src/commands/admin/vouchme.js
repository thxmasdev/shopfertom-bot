import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createVouch, getVouchStats, getSellerVouchStats, updateStickyMessage, getStickyMessage, getServerConfig } from '../../database/database.js';
import dotenv from 'dotenv';

dotenv.config();

const data = new SlashCommandBuilder()
    .setName('vouchme')
    .setDescription('Genera un embed para que los usuarios puedan dar vouches al vendedor');

async function execute(interaction) {
    try {
        // Obtener configuración del servidor
        const serverConfig = await getServerConfig(interaction.guild.id);
        
        // Verificar si el usuario tiene el rol de seller
        const sellerRoleId = serverConfig?.seller_role_id;
        if (sellerRoleId && !interaction.member.roles.cache.has(sellerRoleId)) {
            return await interaction.reply({
                content: '❌ No tienes permisos para usar este comando. Solo los vendedores autorizados pueden acceder.',
                ephemeral: true
            });
        }
        // Crear embed principal
        const vouchEmbed = new EmbedBuilder()
            .setTitle('🌟 Sistema de Vouches')
            .setDescription(`¡Hola! Si has tenido una experiencia de compra con **${interaction.user.displayName}**, puedes dejar tu vouch aquí.\n\n**¿Cómo funciona?**\n• Haz clic en el botón "Dar Vouch"\n• Califica tu experiencia del 1 al 5 (puedes usar decimales como 4.5)\n• Deja un comentario sobre tu experiencia\n\nTu opinión es muy importante para nosotros. 💙`)
            .setColor('#FFD700')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                {
                    name: '👤 Vendedor',
                    value: `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: '📊 Calificación Actual',
                    value: 'Cargando...',
                    inline: true
                }
            )
            .setFooter({ text: 'Sistema de Vouches • ShopFertom', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        // Obtener estadísticas del vendedor específico
        const sellerStats = await getSellerVouchStats(interaction.user.id);
        const sellerStarsDisplay = generateStarsDisplay(sellerStats.averageRating);
        
        vouchEmbed.spliceFields(1, 1, {
            name: '📊 Calificación del Vendedor',
            value: `${sellerStarsDisplay} (${sellerStats.averageRating.toFixed(1)}/5.0)\n📝 ${sellerStats.totalVouches} vouch${sellerStats.totalVouches !== 1 ? 's' : ''}`,
            inline: true
        });

        // Crear botón
        const vouchButton = new ButtonBuilder()
            .setCustomId(`vouch_${interaction.user.id}`)
            .setLabel('⭐ Dar Vouch')
            .setStyle(ButtonStyle.Primary)

        const row = new ActionRowBuilder().addComponents(vouchButton);

        await interaction.reply({
            embeds: [vouchEmbed],
            components: [row]
        });

    } catch (error) {
        console.error('Error en comando vouchme:', error);
        
        const errorMessage = {
            content: '❌ Hubo un error al crear el sistema de vouches.',
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

// Función para manejar el botón de vouch
export async function handleVouchButton(interaction) {
    try {
        const sellerId = interaction.customId.split('_')[1];
        
        // Crear modal para el vouch
        const modal = new ModalBuilder()
            .setCustomId(`vouch_modal_${sellerId}`)
            .setTitle('🌟 Dar Vouch al Vendedor');

        // Campo para la calificación
        const ratingInput = new TextInputBuilder()
            .setCustomId('rating')
            .setLabel('Calificación (1.0 - 5.0)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ej: 4.5, 5.0, 3.5...')
            .setRequired(true)
            .setMaxLength(3);

        // Campo para el mensaje
        const messageInput = new TextInputBuilder()
            .setCustomId('message')
            .setLabel('Tu experiencia (opcional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Cuéntanos sobre tu experiencia de compra...')
            .setRequired(false)
            .setMaxLength(500);

        const firstRow = new ActionRowBuilder().addComponents(ratingInput);
        const secondRow = new ActionRowBuilder().addComponents(messageInput);

        modal.addComponents(firstRow, secondRow);

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Error al manejar botón de vouch:', error);
        
        const errorMessage = {
            content: '❌ Hubo un error al procesar tu solicitud.',
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

// Función para manejar el modal de vouch
export async function handleVouchModal(interaction) {
    try {
        const sellerId = interaction.customId.split('_')[2];
        const rating = parseFloat(interaction.fields.getTextInputValue('rating'));
        const message = interaction.fields.getTextInputValue('message') || 'Sin comentarios';

        // Validar calificación
        if (isNaN(rating) || rating < 1 || rating > 5) {
            await interaction.reply({
                content: '❌ La calificación debe ser un número entre 1.0 y 5.0',
                ephemeral: true
            });
            return;
        }

        // Obtener información del vendedor
        const seller = await interaction.client.users.fetch(sellerId);
        
        // Guardar vouch en la base de datos
        const vouchData = {
            sellerId: sellerId,
            sellerName: seller.displayName,
            voucherId: interaction.user.id,
            voucherName: interaction.user.displayName,
            rating: rating,
            message: message,
            createdAt: Date.now()
        };

        const vouchId = await createVouch(vouchData);
        
        if (!vouchId) {
            await interaction.reply({
                content: '❌ Error al guardar el vouch. Inténtalo de nuevo.',
                ephemeral: true
            });
            return;
        }

        // Crear embed para el canal de vouches
        const vouchChannelEmbed = new EmbedBuilder()
            .setTitle('🌟 Nuevo Vouch Recibido')
            .setDescription(`**${interaction.user.displayName}** ha dado un vouch a **${seller.displayName}**`)
            .setColor('#00FF00')
            .setThumbnail(seller.displayAvatarURL())
            .addFields(
                {
                    name: '👤 Vendedor',
                    value: `<@${sellerId}>`,
                    inline: true
                },
                {
                    name: '🙋‍♂️ Cliente',
                    value: `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: '⭐ Calificación',
                    value: `${generateStarsDisplay(rating)} (${rating}/5.0)`,
                    inline: false
                },
                {
                    name: '💬 Comentario',
                    value: message,
                    inline: false
                }
            )
            .setFooter({ text: `Vouch ID: ${vouchId} • ${new Date().toLocaleString('es-ES')}` })
            .setTimestamp();

        // Enviar al canal de vouches
        const serverConfig = await getServerConfig(interaction.guild.id);
        const vouchChannelId = serverConfig?.vouch_channel_id;
        if (vouchChannelId) {
            const vouchChannel = await interaction.client.channels.fetch(vouchChannelId);
            if (vouchChannel) {
                await vouchChannel.send({ embeds: [vouchChannelEmbed] });
                
                // Actualizar sticky message
                await updateStickyVouchMessage(interaction.client, vouchChannelId);
            }
        }

        // Responder al usuario
        await interaction.reply({
            content: `✅ ¡Gracias por tu vouch! Has calificado a **${seller.displayName}** con **${rating}/5.0** estrellas.`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error al procesar modal de vouch:', error);
        
        const errorMessage = {
            content: '❌ Hubo un error al procesar tu vouch.',
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

// Función para actualizar el sticky message de estadísticas
async function updateStickyVouchMessage(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        // Obtener estadísticas globales de toda la tienda
        const globalStats = await getVouchStats();
        
        // Crear embed de estadísticas globales
        const statsEmbed = new EmbedBuilder()
            .setTitle('📊 Estadísticas Globales de la Tienda')
            .setDescription('Calificación general basada en todos los vouches de todos los vendedores')
            .setColor('#FFD700')
            .addFields(
                {
                    name: '⭐ Calificación Promedio Global',
                    value: `${generateStarsDisplay(globalStats.averageRating)}\n**${globalStats.averageRating.toFixed(1)}/5.0**`,
                    inline: true
                },
                {
                    name: '📝 Total de Vouches',
                    value: `**${globalStats.totalVouches}** vouch${globalStats.totalVouches !== 1 ? 's' : ''}`,
                    inline: true
                },
                {
                    name: '🏆 Estado de la Tienda',
                    value: getStoreStatus(globalStats.averageRating),
                    inline: true
                }
            )
            .setFooter({ text: 'Estadísticas de todos los vendedores • ShopFertom' })
            .setTimestamp();

        // Verificar si existe un sticky message previo
        const existingSticky = await getStickyMessage(channelId, 'vouch_stats');
        
        if (existingSticky) {
            try {
                // Intentar eliminar el mensaje anterior
                const oldMessage = await channel.messages.fetch(existingSticky.message_id);
                await oldMessage.delete();
            } catch (error) {
                console.log('No se pudo eliminar el sticky message anterior:', error.message);
            }
        }

        // Enviar nuevo sticky message
        const newMessage = await channel.send({ embeds: [statsEmbed] });
        
        // Actualizar en la base de datos
        await updateStickyMessage(channelId, newMessage.id, 'vouch_stats');

    } catch (error) {
        console.error('Error al actualizar sticky message:', error);
    }
}

// Función para obtener el estado de la tienda basado en la calificación
function getStoreStatus(rating) {
    if (rating >= 4.8) return '🏆 **Excelente**';
    if (rating >= 4.5) return '🥇 **Muy Bueno**';
    if (rating >= 4.0) return '🥈 **Bueno**';
    if (rating >= 3.5) return '🥉 **Regular**';
    return '📈 **En Mejora**';
}

export default {
    data,
    execute,
    handleVouchButton,
    handleVouchModal
};