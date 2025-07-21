import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getAuctionByChannelId, finishAuction, getAuctionOffers, getServerConfig } from '../../database/database.js';
import { removeAuctionData } from '../../handlers/auctionHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('finalizaroffer')
        .setDescription('Finaliza una subasta activa en un canal específico')
        .addStringOption(option =>
            option.setName('canal')
                .setDescription('ID del canal donde está la subasta')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('ganador')
                .setDescription('Usuario que ganó la subasta')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Verificar si el usuario tiene el rol de seller
            const serverConfig = await getServerConfig(interaction.guild.id);
            const sellerRoleId = serverConfig?.seller_role_id;
            if (sellerRoleId && !interaction.member.roles.cache.has(sellerRoleId)) {
                return await interaction.editReply({
                    content: '❌ No tienes permisos para usar este comando. Solo los vendedores autorizados pueden acceder.',
                    ephemeral: true
                });
            }

            const channelId = interaction.options.getString('canal');
            const winner = interaction.options.getUser('ganador');

            // Verificar que el canal existe
            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                return await interaction.editReply({
                    content: '❌ Error: No se encontró el canal especificado.',
                    ephemeral: true
                });
            }

            // Buscar la subasta activa en ese canal
            const auction = await getAuctionByChannelId(channelId);
            if (!auction) {
                return await interaction.editReply({
                    content: '❌ Error: No se encontró una subasta activa en ese canal.',
                    ephemeral: true
                });
            }

            // Obtener todas las ofertas de la subasta
            const offers = await getAuctionOffers(auction.id);

            // Finalizar la subasta en la base de datos
            await finishAuction(auction.id, winner.id);
            
            // Eliminar datos de subasta del handler
            removeAuctionData(auction.message_id);

            // Eliminar mensajes de la subasta (excepto el embed de cuenta)
            try {
                // Eliminar embed de ofertas
                if (auction.offer_embed_id) {
                    const offerMessage = await channel.messages.fetch(auction.message_id).catch(() => null);
                    if (offerMessage) await offerMessage.delete();
                }

                // Eliminar última notificación
                if (auction.notification_id) {
                    const notificationMessage = await channel.messages.fetch(auction.notification_id).catch(() => null);
                    if (notificationMessage) await notificationMessage.delete();
                }
            } catch (deleteError) {
                console.log('Error al eliminar algunos mensajes:', deleteError.message);
            }

            // Crear embed de finalización
            const finalizationEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 ¡Subasta Finalizada!')
                .setDescription(`**🏆 Ganador:** ${winner.displayName} (${winner.tag})\n**💰 Precio final:** $${auction.current_offer ? parseFloat(auction.current_offer).toFixed(2) : 'N/A'} USD`)
                .addFields(
                    { 
                        name: '📊 Rango de ofertas:', 
                        value: `$${parseFloat(auction.min_price).toFixed(2)} - $${parseFloat(auction.max_price).toFixed(2)} USD`, 
                        inline: true 
                    },
                    { 
                        name: '📈 Total de ofertas:', 
                        value: offers.length.toString(), 
                        inline: true 
                    },
                    { 
                        name: '⏰ Finalizada:', 
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`, 
                        inline: true 
                    }
                )
                .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: '✅ Esta subasta ha sido cerrada oficialmente' })
                .setTimestamp();

            // Crear embed con historial de ofertas
            let historyText = '';
            const itemsPerPage = 10;
            let currentPage = 0;
            
            if (offers.length > 0) {
                // Ordenar ofertas por fecha (más reciente primero)
                const sortedOffers = [...offers].sort((a, b) => b.created_at - a.created_at);
                
                // Calcular ofertas para la página actual
                const startIndex = currentPage * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, sortedOffers.length);
                const pageOffers = sortedOffers.slice(startIndex, endIndex);
                
                pageOffers.forEach((offer, index) => {
                    const isWinner = offer.user_id === winner.id;
                    const globalIndex = startIndex + index + 1;
                    const timestamp = Math.floor(offer.created_at / 1000);
                    
                    let emoji = '💰';
                    if (isWinner) {
                        emoji = '🏆';
                    }
                    
                    const amount = parseFloat(offer.amount).toFixed(2);
                    historyText += `${emoji} **${offer.user_name}** - **$${amount} USD**\n📅 <t:${timestamp}:R>\n\n`;
                });
                
                // Información de paginación
                const totalPages = Math.ceil(sortedOffers.length / itemsPerPage);
                if (totalPages > 1) {
                    historyText += `\n📄 **Página ${currentPage + 1} de ${totalPages}** • Total: ${offers.length} ofertas`;
                }
            } else {
                historyText = 'No hubo ofertas en esta subasta.';
            }

            const historyEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('📋 Historial de Ofertas')
                .setDescription(historyText)
                .setFooter({ text: '🏆 Ganador marcado con corona • Ordenado por fecha (más reciente primero)' });

            // Crear botones de navegación si hay múltiples páginas
            const totalPages = Math.ceil(offers.length / itemsPerPage);
            let components = [];
            
            if (totalPages > 1) {
                const navigationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`history_prev_${auction.id}_0`)
                            .setLabel('◀️ Anterior')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId(`history_next_${auction.id}_0`)
                            .setLabel('Siguiente ▶️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(totalPages <= 1)
                    );
                components.push(navigationRow);
            }

            // Enviar embeds de finalización
            await channel.send({
                content: `🎉 **¡Subasta finalizada!** Felicidades ${winner} por ganar esta subasta.`,
                embeds: [finalizationEmbed, historyEmbed],
                components: components
            });

            // Responder al administrador
            await interaction.editReply({
                content: `✅ Subasta finalizada exitosamente en ${channel}. Ganador: ${winner.displayName}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error en finalizaroffer:', error);
            
            try {
                await interaction.editReply({
                    content: '❌ Ocurrió un error al finalizar la subasta.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Error al enviar respuesta de error:', replyError);
            }
        }
    }
};

// Función para manejar la navegación del historial
export const handleHistoryNavigation = async (interaction) => {
    if (!interaction.customId.startsWith('history_')) return;

    try {
        const [action, direction, auctionId, currentPageStr] = interaction.customId.split('_');
        const currentPage = parseInt(currentPageStr);
        const itemsPerPage = 10;
        
        // Obtener datos de la subasta
        const offers = await getAuctionOffers(parseInt(auctionId));
        if (!offers || offers.length === 0) {
            return await interaction.reply({
                content: '❌ No se encontraron ofertas para esta subasta.',
                ephemeral: true
            });
        }

        // Calcular nueva página
        const totalPages = Math.ceil(offers.length / itemsPerPage);
        let newPage = currentPage;
        
        if (direction === 'next' && currentPage < totalPages - 1) {
            newPage = currentPage + 1;
        } else if (direction === 'prev' && currentPage > 0) {
            newPage = currentPage - 1;
        }

        // Ordenar ofertas por fecha (más reciente primero)
        const sortedOffers = [...offers].sort((a, b) => b.created_at - a.created_at);
        
        // Calcular ofertas para la nueva página
        const startIndex = newPage * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, sortedOffers.length);
        const pageOffers = sortedOffers.slice(startIndex, endIndex);
        
        // Generar texto del historial
        let historyText = '';
        pageOffers.forEach((offer, index) => {
            const timestamp = Math.floor(offer.created_at / 1000);
            const amount = parseFloat(offer.amount).toFixed(2);
            
            // Verificar si es el ganador (buscar en el embed original)
            const originalEmbed = interaction.message.embeds[0];
            const winnerMention = originalEmbed.description.match(/\*\*🏆 Ganador:\*\* <@(\d+)>/)?.[1];
            const isWinner = offer.user_id === winnerMention;
            
            let emoji = '💰';
            if (isWinner) {
                emoji = '🏆';
            }
            
            historyText += `${emoji} **${offer.user_name}** - **$${amount} USD**\n📅 <t:${timestamp}:R>\n\n`;
        });
        
        // Información de paginación
        if (totalPages > 1) {
            historyText += `\n📄 **Página ${newPage + 1} de ${totalPages}** • Total: ${offers.length} ofertas`;
        }

        // Actualizar embed
        const updatedHistoryEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('📋 Historial de Ofertas')
            .setDescription(historyText)
            .setFooter({ text: '🏆 Ganador marcado con corona • Ordenado por fecha (más reciente primero)' });

        // Actualizar botones
        const navigationRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`history_prev_${auctionId}_${newPage}`)
                    .setLabel('◀️ Anterior')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage === 0),
                new ButtonBuilder()
                    .setCustomId(`history_next_${auctionId}_${newPage}`)
                    .setLabel('Siguiente ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage === totalPages - 1)
            );

        // Mantener el primer embed y actualizar solo el segundo
        const embeds = [interaction.message.embeds[0], updatedHistoryEmbed];
        
        await interaction.update({
            embeds: embeds,
            components: [navigationRow]
        });

    } catch (error) {
        console.error('Error en handleHistoryNavigation:', error);
        await interaction.reply({
            content: '❌ Error al navegar por el historial.',
            ephemeral: true
        });
    }
};