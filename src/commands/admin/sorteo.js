import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { 
    createGiveaway, 
    getGiveawayByMessageId, 
    addGiveawayParticipant, 
    removeGiveawayParticipant, 
    getGiveawayParticipantCount, 
    isUserParticipating, 
    getGiveawayParticipants, 
    finishGiveaway 
} from '../../database/database.js';
import { activeGiveaways } from '../../handlers/giveawayHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('sorteo')
        .setDescription('Gestiona sorteos en el servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('empezar')
                .setDescription('Inicia un nuevo sorteo')
                .addIntegerOption(option =>
                    option.setName('ganadores')
                        .setDescription('Número de ganadores')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addStringOption(option =>
                    option.setName('premio')
                        .setDescription('Premio del sorteo')
                        .setRequired(true)
                        .setMaxLength(200))
                .addStringOption(option =>
                    option.setName('tiempo')
                        .setDescription('Duración del sorteo (ej: 1h, 30m, 2d)')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal donde se realizará el sorteo')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'empezar') {
            await handleStartGiveaway(interaction);
        }
    }
};

async function handleStartGiveaway(interaction) {
    try {
        const winners = interaction.options.getInteger('ganadores');
        const prize = interaction.options.getString('premio');
        const timeString = interaction.options.getString('tiempo');
        const channel = interaction.options.getChannel('canal');

        // Validar que el canal sea de texto
        if (!channel.isTextBased()) {
            return await interaction.reply({
                content: '❌ El canal debe ser un canal de texto.',
                ephemeral: true
            });
        }

        // Parsear el tiempo
        const duration = parseTimeString(timeString);
        if (!duration) {
            return await interaction.reply({
                content: '❌ Formato de tiempo inválido. Usa: 1h, 30m, 2d, etc.',
                ephemeral: true
            });
        }

        const endTime = Date.now() + duration;
        const endDate = new Date(endTime);

        // Crear embed del sorteo
        const giveawayEmbed = new EmbedBuilder()
            .setTitle('🎉 ¡SORTEO ACTIVO!')
            .setDescription(`**Premio:** ${prize}\n\n**Ganadores:** ${winners}\n**Finaliza:** <t:${Math.floor(endTime / 1000)}:R>\n\n¡Haz clic en el botón para participar!`)
            .setColor('#FFD700')
            .setThumbnail('https://cdn.discordapp.com/emojis/1234567890123456789.png') // Emoji de regalo
            .setFooter({ 
                text: `Iniciado por ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();

        // Crear botón
        const joinButton = new ButtonBuilder()
            .setCustomId('giveaway_join')
            .setLabel('🎁 Entrar al sorteo (0)')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(joinButton);

        // Enviar mensaje al canal especificado
        const giveawayMessage = await channel.send({
            embeds: [giveawayEmbed],
            components: [row]
        });

        // Guardar en base de datos
        const giveawayId = await createGiveaway({
            channelId: channel.id,
            messageId: giveawayMessage.id,
            createdBy: interaction.user.id,
            createdByName: interaction.user.tag,
            winnersCount: winners,
            prize: prize,
            endTime: endTime,
            createdAt: Date.now()
        });

        if (!giveawayId) {
            await giveawayMessage.delete();
            return await interaction.reply({
                content: '❌ Error al crear el sorteo en la base de datos.',
                ephemeral: true
            });
        }

        // Programar finalización automática
        const timeout = setTimeout(async () => {
            await endGiveaway(giveawayId, channel, giveawayMessage.id);
            activeGiveaways.delete(giveawayId);
        }, duration);

        activeGiveaways.set(giveawayId, {
            timeout,
            messageId: giveawayMessage.id,
            channelId: channel.id
        });

        await interaction.reply({
            content: `✅ Sorteo creado exitosamente en ${channel}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error al crear sorteo:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocurrió un error al crear el sorteo.',
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: '❌ Ocurrió un error al crear el sorteo.',
                ephemeral: true
            });
        }
    }
}

// Manejar clics en el botón del sorteo
export async function handleGiveawayButton(interaction) {
    try {
        const giveaway = await getGiveawayByMessageId(interaction.message.id);
        if (!giveaway) {
            return await interaction.reply({
                content: '❌ Este sorteo ya no está activo.',
                ephemeral: true
            });
        }

        const isParticipating = await isUserParticipating(giveaway.id, interaction.user.id);
        
        if (isParticipating) {
            // Mostrar botón para salir
            const leaveButton = new ButtonBuilder()
                .setCustomId('giveaway_leave')
                .setLabel('❌ Salir del sorteo')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(leaveButton);

            return await interaction.reply({
                content: '🎁 Ya estás participando en este sorteo. ¿Quieres salir?',
                components: [row],
                ephemeral: true
            });
        } else {
            // Agregar al sorteo
            const success = await addGiveawayParticipant(giveaway.id, interaction.user.id, interaction.user.tag);
            if (success) {
                const participantCount = await getGiveawayParticipantCount(giveaway.id);
                
                // Actualizar botón con nuevo contador
                const updatedButton = new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel(`🎁 Entrar al sorteo (${participantCount})`)
                    .setStyle(ButtonStyle.Primary);

                const updatedRow = new ActionRowBuilder().addComponents(updatedButton);

                await interaction.update({ components: [updatedRow] });
                
                await interaction.followUp({
                    content: '✅ ¡Te has unido al sorteo exitosamente!',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ Error al unirte al sorteo.',
                    ephemeral: true
                });
            }
        }
    } catch (error) {
        console.error('Error en botón de sorteo:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocurrió un error.',
                ephemeral: true
            });
        }
    }
}

// Manejar salir del sorteo
export async function handleGiveawayLeave(interaction) {
    try {
        // Obtener el sorteo desde el mensaje original, no desde el mensaje de respuesta
        const originalMessageId = interaction.message.reference?.messageId || interaction.message.id;
        let giveaway;
        
        // Intentar obtener el sorteo desde diferentes fuentes
        if (interaction.message.reference) {
            // Si es una respuesta, buscar el mensaje original
            try {
                const originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                giveaway = await getGiveawayByMessageId(originalMessage.id);
            } catch (error) {
                console.error('Error al obtener mensaje original:', error);
            }
        }
        
        // Si no se encontró, buscar en todos los sorteos activos del canal
        if (!giveaway) {
            const activeGiveawaysArray = Array.from(activeGiveaways.entries());
            const channelGiveaway = activeGiveawaysArray.find(([id, data]) => 
                data.channelId === interaction.channel.id
            );
            
            if (channelGiveaway) {
                giveaway = await getGiveawayByMessageId(channelGiveaway[1].messageId);
            }
        }
        
        if (!giveaway) {
            return await interaction.update({
                content: '❌ Este sorteo ya no está activo.',
                components: []
            });
        }

        const success = await removeGiveawayParticipant(giveaway.id, interaction.user.id);
        if (success) {
            const participantCount = await getGiveawayParticipantCount(giveaway.id);
            
            // Actualizar botón principal con nuevo contador
            const channel = interaction.client.channels.cache.get(giveaway.channel_id);
            if (channel) {
                try {
                    const originalMessage = await channel.messages.fetch(giveaway.message_id);
                    const updatedButton = new ButtonBuilder()
                        .setCustomId('giveaway_join')
                        .setLabel(`🎁 Entrar al sorteo (${participantCount})`)
                        .setStyle(ButtonStyle.Primary);

                    const updatedRow = new ActionRowBuilder().addComponents(updatedButton);
                    await originalMessage.edit({ components: [updatedRow] });
                } catch (error) {
                    console.error('Error al actualizar mensaje original:', error);
                }
            }

            await interaction.update({
                content: '✅ Has salido del sorteo exitosamente. Puedes volver a entrar cuando quieras.',
                components: []
            });
        } else {
            await interaction.update({
                content: '❌ Error al salir del sorteo.',
                components: []
            });
        }
    } catch (error) {
        console.error('Error al salir del sorteo:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocurrió un error al salir del sorteo.',
                ephemeral: true
            });
        } else {
            await interaction.update({
                content: '❌ Ocurrió un error.',
                components: []
            });
        }
    }
}

// Finalizar sorteo automáticamente
async function endGiveaway(giveawayId, channel, messageId) {
    try {
        const participants = await getGiveawayParticipants(giveawayId);
        const giveaway = await getGiveawayByMessageId(messageId);
        
        if (!giveaway) return;

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

// Función para parsear tiempo (1h, 30m, 2d, etc.)
function parseTimeString(timeStr) {
    const regex = /^(\d+)([smhd])$/i;
    const match = timeStr.match(regex);
    
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    const multipliers = {
        's': 1000,           // segundos
        'm': 60 * 1000,     // minutos
        'h': 60 * 60 * 1000, // horas
        'd': 24 * 60 * 60 * 1000 // días
    };
    
    return value * multipliers[unit];
}