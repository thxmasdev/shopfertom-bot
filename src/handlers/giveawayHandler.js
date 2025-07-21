import { getActiveGiveaways, finishGiveaway, getGiveawayParticipants } from '../database/database.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const activeGiveaways = new Map();

// Cargar sorteos activos al iniciar el bot
export async function loadActiveGiveaways(client) {
    try {
        const giveaways = await getActiveGiveaways();
        let loadedCount = 0;
        
        for (const giveaway of giveaways) {
            try {
                const channel = client.channels.cache.get(giveaway.channel_id);
                if (!channel) {
                    console.log(`⚠️ Canal ${giveaway.channel_id} no encontrado para sorteo ${giveaway.id}`);
                    await finishGiveaway(giveaway.id);
                    continue;
                }
                
                const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
                if (!message) {
                    console.log(`⚠️ Mensaje ${giveaway.message_id} no encontrado para sorteo ${giveaway.id}`);
                    await finishGiveaway(giveaway.id);
                    continue;
                }
                
                const timeLeft = giveaway.end_time - Date.now();
                
                if (timeLeft <= 0) {
                    // El sorteo ya debería haber terminado
                    await endGiveaway(giveaway.id, channel, giveaway.message_id);
                    console.log(`✅ Sorteo ${giveaway.id} finalizado (tiempo expirado)`);
                } else {
                    // Programar finalización
                    const timeout = setTimeout(async () => {
                        await endGiveaway(giveaway.id, channel, giveaway.message_id);
                        activeGiveaways.delete(giveaway.id);
                    }, timeLeft);
                    
                    activeGiveaways.set(giveaway.id, {
                        timeout,
                        messageId: giveaway.message_id,
                        channelId: giveaway.channel_id
                    });
                    
                    loadedCount++;
                    console.log(`✅ Sorteo ${giveaway.id} cargado en canal ${channel.name}`);
                }
                
            } catch (error) {
                console.error(`❌ Error al cargar sorteo ${giveaway.id}:`, error);
                await finishGiveaway(giveaway.id);
            }
        }
        
        console.log(`📊 ${giveaways.length} sorteos activos encontrados, ${loadedCount} cargados exitosamente`);
        
    } catch (error) {
        console.error('❌ Error al cargar sorteos activos:', error);
    }
}

// Finalizar sorteo
async function endGiveaway(giveawayId, channel, messageId) {
    try {
        const participants = await getGiveawayParticipants(giveawayId);
        
        // Obtener información del sorteo desde el mensaje
        let giveaway;
        try {
            const message = await channel.messages.fetch(messageId);
            const embed = message.embeds[0];
            if (embed) {
                const description = embed.description;
                const prizeMatch = description.match(/\*\*Premio:\*\* (.+?)\n/);
                const winnersMatch = description.match(/\*\*Ganadores:\*\* (\d+)/);
                const footerText = embed.footer?.text || '';
                
                giveaway = {
                    prize: prizeMatch ? prizeMatch[1] : 'Premio desconocido',
                    winners_count: winnersMatch ? parseInt(winnersMatch[1]) : 1,
                    created_by_name: footerText.replace('Iniciado por ', '') || 'Usuario desconocido'
                };
            }
        } catch (error) {
            console.error('Error al obtener información del sorteo:', error);
            giveaway = {
                prize: 'Premio desconocido',
                winners_count: 1,
                created_by_name: 'Usuario desconocido'
            };
        }
        
        await finishGiveaway(giveawayId);

        let resultEmbed;
        let winnerMentions = '';

        let celebrationMessage = null;
        
        if (participants.length === 0) {
            resultEmbed = new EmbedBuilder()
                .setTitle('🎉 Sorteo Finalizado')
                .setDescription(`**Premio:** ${giveaway.prize}\n\n❌ **No hubo participantes**\n\nEl sorteo ha terminado sin ganadores.`)
                .setColor('#FF6B6B')
                .setFooter({ text: 'ShopFertom Bot', iconURL: channel.client.user.displayAvatarURL() })
                .setTimestamp();
        } else {
            // Dividir premios si hay comas
            const prizes = giveaway.prize.split(',').map(p => p.trim());
            
            // Seleccionar ganadores aleatoriamente
            const winners = [];
            const participantsCopy = [...participants];
            const winnersCount = Math.min(giveaway.winners_count, participants.length);

            for (let i = 0; i < winnersCount; i++) {
                const randomIndex = Math.floor(Math.random() * participantsCopy.length);
                winners.push(participantsCopy.splice(randomIndex, 1)[0]);
            }

            winnerMentions = winners.map(winner => `<@${winner.user_id}>`).join(' ');
            
            // Crear lista de ganadores con premios específicos
            let winnersList = '';
            const positionEmojis = ['🥇', '🥈', '🥉', '🏅', '🎖️', '🏆', '⭐', '🌟', '✨', '💫'];
            
            winners.forEach((winner, index) => {
                const emoji = positionEmojis[index] || '🎁';
                const prize = prizes[index] || prizes[0] || 'Premio';
                winnersList += `${emoji} **${index + 1}° Lugar:** ${winner.user_name} - **${prize}**\n`;
            });

            resultEmbed = new EmbedBuilder()
                .setTitle('🎊 ¡SORTEO FINALIZADO! 🎊')
                .setDescription(`🎁 **Premio${prizes.length > 1 ? 's' : ''}:** ${giveaway.prize}\n\n${winnersList}\n👥 **Total de participantes:** ${participants.length}`)
                .setColor('#FFD700')
                .setFooter({ text: 'ShopFertom Bot', iconURL: channel.client.user.displayAvatarURL() })
                .setTimestamp();

            // Crear mensaje de celebración separado
            celebrationMessage = {
                embeds: [new EmbedBuilder()
                    .setTitle('🎉 ¡FELICIDADES A LOS GANADORES! 🎉')
                    .setDescription(`${winnerMentions}\n\n🎊 **¡Disfruten sus premios!** 🎊`)
                    .setColor('#00FF7F')
                    .setFooter({ text: 'ShopFertom Bot', iconURL: channel.client.user.displayAvatarURL() })
                    .setTimestamp()],
                allowedMentions: { users: winners.map(w => w.user_id) }
            };
        }

        // Actualizar mensaje original
        try {
            const originalMessage = await channel.messages.fetch(messageId);
            await originalMessage.edit({
                embeds: [resultEmbed],
                components: [] // Remover botones
            });
        } catch (error) {
            console.error('Error al actualizar mensaje original:', error);
        }

        // Enviar mensaje de celebración si hay ganadores
        if (celebrationMessage) {
            const celebrationMsg = await channel.send(celebrationMessage);
            // Agregar reacción de corazón para que la gente pueda reaccionar
            try {
                await celebrationMsg.react('❤️');
                await celebrationMsg.react('🎉');
                await celebrationMsg.react('👏');
            } catch (error) {
                console.error('Error al agregar reacciones:', error);
            }
        }

    } catch (error) {
        console.error('Error al finalizar sorteo:', error);
    }
}

export { activeGiveaways };