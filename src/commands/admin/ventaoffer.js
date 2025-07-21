import { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAuction, getAuctionByMessageId, updateCurrentOffer, updateNotificationId, hasUserOfferedRecently, getServerConfig } from '../../database/database.js';
import { offerData, updateAuctionData } from '../../handlers/auctionHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'config.json'), 'utf8'));

// Función para obtener emoji del config o usar fallback
function getEmoji(emojiName, fallback = '🔹') {
    const emojiId = config.emojis[emojiName];
    if (emojiId && emojiId.trim() !== '') {
        return `<:${emojiName}:${emojiId}>`;
    }
    return fallback;
}



export default {
    data: new SlashCommandBuilder()
        .setName('ventaoffer')
        .setDescription('Crear una subasta de cuenta de Minecraft con sistema de ofertas')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(option =>
            option.setName('precio_minimo')
                .setDescription('Precio mínimo de oferta en USD (ejemplo: 20.00)')
                .setRequired(true)
                .setMaxLength(10))
        .addStringOption(option =>
            option.setName('precio_maximo')
                .setDescription('Precio máximo de oferta en USD (ejemplo: 80.00)')
                .setRequired(true)
                .setMaxLength(10))
        .addStringOption(option =>
            option.setName('nick')
                .setDescription('Nickname de Minecraft')
                .setRequired(false)
                .setMaxLength(16))
        .addStringOption(option =>
            option.setName('lunar_cosmetics')
                .setDescription('Precio de cosméticos Lunar en USD (ejemplo: 15.99)')
                .setRequired(false)
                .setMaxLength(10))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('Ranks de servidores (ejemplo: Hypixel: MVP+, UniversoCraft: Jupiter)')
                .setRequired(false)
                .setMaxLength(500))
        .addStringOption(option =>
            option.setName('capes')
                .setDescription('Capas de Minecraft (ejemplo: 🔥 Minecon 2016, ⚡ Migrator)')
                .setRequired(false)
                .setMaxLength(500))
        .addStringOption(option =>
            option.setName('metodos')
                .setDescription('Métodos de pago aceptados')
                .setRequired(false)
                .setMaxLength(200))
        .addStringOption(option =>
            option.setName('imagenes')
                .setDescription('Enlaces de imágenes separados por espacios')
                .setRequired(false)
                .setMaxLength(500)),
    
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

            // Obtener los valores de los parámetros
            const nick = interaction.options.getString('nick') || '';
            const precioMinimo = parseFloat(interaction.options.getString('precio_minimo'));
            const precioMaximo = parseFloat(interaction.options.getString('precio_maximo'));
            const cosmeticos = interaction.options.getString('lunar_cosmetics') || '';
            const ranks = interaction.options.getString('rank') || '';
            const capes = interaction.options.getString('capes') || '';
            const metodosPago = interaction.options.getString('metodos') || '';
            const fotos = interaction.options.getString('imagenes') || '';

            // Validar precios
            if (isNaN(precioMinimo) || isNaN(precioMaximo) || precioMinimo >= precioMaximo) {
                return await interaction.editReply({
                    content: '❌ Error: El precio mínimo debe ser menor al precio máximo y ambos deben ser números válidos.',
                    ephemeral: true
                });
            }

            // Crear el embed principal de la cuenta con emojis personalizados
            const shopEmoji = getEmoji('shop', '🏪');
            const verifyEmoji = getEmoji('verify', '✅');
            const minecraftEmoji = getEmoji('minecraft', '🎮');
            
            const accountEmbed = new EmbedBuilder()
                .setColor(0x00D4AA)
                .setTitle(`${verifyEmoji} Cuenta de Minecraft - SUBASTA`)
                .setDescription('🔥 **¡Cuenta en subasta!** Haz tu oferta y compite por esta cuenta.')

            // Agregar información básica con emojis personalizados
            const cosmeticsEmoji = getEmoji('cosmetics', '✨');
            const rankEmoji = getEmoji('rank', '🏆');
            const capesEmoji = getEmoji('capes', '👘');
            const paymentEmoji = getEmoji('payment', '💳');
            
            if (nick) {
                accountEmbed.addFields({
                    name: `${minecraftEmoji} Nickname`,
                    value: `\`${nick}\``,
                    inline: false
                });
            }

            if (cosmeticos) {
                accountEmbed.addFields({
                    name: `${cosmeticsEmoji} Lunar Cosmetics`,
                    value: `\`$${cosmeticos}\``,
                    inline: false
                });
            }

            if (ranks) {
                accountEmbed.addFields({
                    name: `${rankEmoji} Ranks`,
                    value: `\`${ranks.replace(/,\s*/g, ',\n')}\``,
                    inline: false
                });
            }

            if (capes) {
                accountEmbed.addFields({
                    name: `${capesEmoji} Capas`,
                    value: capes,
                    inline: false
                });
            }

            if (metodosPago) {
                accountEmbed.addFields({
                    name: `${paymentEmoji} Métodos de Pago`,
                    value: metodosPago.replace(/,\s*/g, ',\n'),
                    inline: false
                });
            }

            // Función para obtener render 3D de Minecraft
            const getMinecraftRender = async (nickname) => {
                try {
                    const renderUrl = `https://vzge.me/bust/500/${nickname}`;
                    console.log(`Render 3D generado: ${renderUrl}`);
                    return renderUrl;
                } catch (error) {
                    console.error('Error al obtener render 3D:', error);
                    return null;
                }
            };

            // Procesar imágenes, GIFs y videos
            let mediaUrls = [];
            if (fotos) {
                mediaUrls = fotos.split(' ')
                    .map(url => url.trim())
                    .filter(url => url.startsWith('http'));
            }

            // Configurar thumbnail con skin del nickname (a la derecha)
            if (nick) {
                try {
                    const render3D = await getMinecraftRender(nick);
                    if (render3D) {
                        accountEmbed.setThumbnail(render3D);
                    }
                } catch (error) {
                    console.error('Error generando render 3D:', error);
                }
            }

            // Configurar imagen principal con URLs proporcionadas (abajo)
            if (mediaUrls.length > 0) {
                accountEmbed.setImage(mediaUrls[0]);
            }

            // Footer del embed de cuenta
            const sellerEmoji = getEmoji('seller', '👤');
            accountEmbed.setFooter({ 
                text: `Subasta creada por ${interaction.user.displayName}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

            // Crear embed de ofertas
            const offerEmoji = getEmoji('offer', '💰');
            const offerEmbed = new EmbedBuilder()
                .setColor(0xFF6B35)
                .setTitle(`${offerEmoji} Sistema de Ofertas`)
                .setDescription(`**💵 Rango de ofertas:** $${precioMinimo.toFixed(2)} - $${precioMaximo.toFixed(2)} USD\n\n🔥 **Oferta actual:** Ninguna\n👤 **Mejor postor:** Nadie aún\n\n⚡ **¡Haz tu oferta ahora!**`)
                .addFields(
                    {
                        name: '📋 Reglas de la subasta',
                        value: '• Solo puedes ofertar una vez hasta que alguien más oferte\n• La oferta debe estar entre el mínimo y máximo\n• No puedes retirar tu oferta una vez hecha\n• Si haces una oferta de manera que no cumpliras es motivo de ban',
                        inline: false
                    }
                )
                .setFooter({ text: '💡 Usa el botón "Hacer Oferta" para participar' });

            // Crear botones separados
            const offerButton = new ButtonBuilder()
                .setCustomId('make_offer')
                .setLabel('💰 Hacer Oferta')
                .setStyle(ButtonStyle.Primary);

            // Crear botones para el embed de cuenta
            const accountButtons = [];
            
            if (nick) {
                const nameMCButton = new ButtonBuilder()
                    .setLabel('🔗 Ver en NameMC')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://es.namemc.com/profile/${nick}`);
                accountButtons.push(nameMCButton);
            }
            
            let galleryId = null;
            if (mediaUrls.length > 1) {
                galleryId = `gallery_ventaoffer_${interaction.user.id}_${Date.now()}`;
                const galleryButton = new ButtonBuilder()
                    .setCustomId(galleryId)
                    .setLabel(`🖼️ Ver todas las imágenes (${mediaUrls.length})`)
                    .setStyle(ButtonStyle.Success);
                accountButtons.push(galleryButton);
            }

            // Fila de botones para el embed de ofertas (solo botón de ofertar)
            const offerButtonRow = new ActionRowBuilder().addComponents(offerButton);
            
            // Fila de botones para el embed de cuenta
            const accountButtonRow = accountButtons.length > 0 ? new ActionRowBuilder().addComponents(accountButtons) : null;

            // Crear canal en la categoría de ventas
            const salesCategoryId = serverConfig?.sales_category_id;
            let newChannel = null;

            if (salesCategoryId) {
                try {
                    const guild = interaction.guild;
                    const category = guild.channels.cache.get(salesCategoryId);

                    if (category && category.type === ChannelType.GuildCategory) {
                        // Nombre del canal basado en el precio mínimo
                        const channelName = `【💲${precioMinimo.toFixed(0)}】minecraft`;

                        // Buscar posición correcta basada en el precio
                        const existingChannels = category.children.cache
                            .filter(channel => channel.type === ChannelType.GuildText)
                            .sort((a, b) => {
                                // Extraer precio del nuevo formato 【💲precio】minecraft
                                const priceMatchA = a.name.match(/【💲(\d+(?:\.\d+)?)】/);
                                const priceMatchB = b.name.match(/【💲(\d+(?:\.\d+)?)】/);
                                const priceA = priceMatchA ? parseFloat(priceMatchA[1]) : 0;
                                const priceB = priceMatchB ? parseFloat(priceMatchB[1]) : 0;
                                return priceB - priceA; // Orden descendente
                            });

                        let position = 0;
                        const currentPrice = parseFloat(precioMinimo.toFixed(0));
                        
                        for (const channel of existingChannels.values()) {
                            // Extraer precio del nuevo formato 【💲precio】minecraft
                            const priceMatch = channel.name.match(/【💲(\d+(?:\.\d+)?)】/);
                            const channelPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
                            if (currentPrice > channelPrice) {
                                break;
                            }
                            position++;
                        }

                        // Crear el canal con permisos restrictivos
                        newChannel = await guild.channels.create({
                            name: channelName,
                            type: ChannelType.GuildText,
                            parent: category,
                            position: position,
                            topic: `Subasta de cuenta Minecraft - $${precioMinimo.toFixed(2)} - $${precioMaximo.toFixed(2)} USD`,
                            permissionOverwrites: [
                                {
                                    id: guild.roles.everyone.id,
                                    deny: [
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.AddReactions,
                                        PermissionFlagsBits.CreatePublicThreads,
                                        PermissionFlagsBits.CreatePrivateThreads,
                                        PermissionFlagsBits.SendMessagesInThreads,
                                        PermissionFlagsBits.UseApplicationCommands,
                                        PermissionFlagsBits.SendVoiceMessages,
                                        PermissionFlagsBits.AttachFiles,
                                        PermissionFlagsBits.EmbedLinks,
                                        PermissionFlagsBits.UseExternalEmojis,
                                        PermissionFlagsBits.UseExternalStickers
                                    ],
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.ReadMessageHistory
                                    ]
                                }
                            ]
                        });
                    }
                } catch (channelError) {
                    console.error('Error al crear canal:', channelError);
                }
            }

            // Combinar todos los botones en una sola fila
            const allButtons = [];
            
            // Agregar botón de ofertar primero
            allButtons.push(offerButton);
            
            // Agregar botones de cuenta
            if (accountButtons.length > 0) {
                allButtons.push(...accountButtons);
            }
            
            // Crear fila de botones combinada
            const combinedButtonRow = new ActionRowBuilder().addComponents(allButtons);
            
            // Enviar todo en un solo mensaje con ambos embeds
            const channelToSend = newChannel || interaction.channel;
            const sentMessage = await channelToSend.send({
                embeds: [accountEmbed, offerEmbed],
                components: [combinedButtonRow]
            });
            
            // Guardar datos de la galería si hay múltiples imágenes
            if (mediaUrls.length > 1 && galleryId) {
                global.galleryData = global.galleryData || new Map();
                global.galleryData.set(galleryId, {
                    mediaUrls: mediaUrls,
                    createdBy: interaction.user.id,
                    messageId: sentMessage.id
                });
            }

            // Guardar datos en la base de datos
            const auctionId = await createAuction({
                channelId: channelToSend.id,
                messageId: sentMessage.id,
                accountEmbedId: sentMessage.id,
                offerEmbedId: sentMessage.id,
                minPrice: precioMinimo,
                maxPrice: precioMaximo,
                createdBy: interaction.user.id,
                createdAt: Date.now()
            });

            // Mantener compatibilidad con el Map temporal
            offerData.set(sentMessage.id, {
                auctionId: auctionId,
                channelId: channelToSend.id,
                messageId: sentMessage.id,
                minPrice: precioMinimo,
                maxPrice: precioMaximo,
                currentOffer: null,
                currentBidder: null,
                lastBidders: new Set(),
                createdBy: interaction.user.id,
                createdAt: Date.now(),
                lastNotificationId: null
            });

            // Responder al usuario
            const responseMessage = newChannel 
                ? `✅ ¡Subasta creada exitosamente en ${newChannel}!`
                : '✅ ¡Subasta creada exitosamente!';
            
            await interaction.editReply({
                content: responseMessage,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error en el comando ventaoffer:', error);
            
            try {
                await interaction.editReply({
                    content: '❌ Ocurrió un error al procesar la subasta.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Error al enviar respuesta de error:', replyError);
            }
        }
    }
};

// Función para manejar las interacciones de botones
export const handleOfferButton = async (interaction) => {
    if (interaction.customId !== 'make_offer') return;

    try {
        const messageId = interaction.message.id;
        const auctionData = offerData.get(messageId);

        if (!auctionData) {
            return await interaction.reply({
                content: '❌ Error: No se encontraron datos de esta subasta.',
                ephemeral: true
            });
        }

        // Verificar si el usuario puede ofertar
        if (auctionData.currentBidder === interaction.user.id) {
            return await interaction.reply({
                content: '❌ Ya tienes la oferta más alta. Espera a que alguien más oferte para poder ofertar de nuevo.',
                ephemeral: true
            });
        }

        // Crear modal para la oferta
        const modal = new ModalBuilder()
            .setCustomId(`offer_modal_${messageId}`)
            .setTitle('💰 Hacer Oferta');

        const offerInput = new TextInputBuilder()
            .setCustomId('offer_amount')
            .setLabel(`Cantidad (entre $${auctionData.minPrice.toFixed(2)} - $${auctionData.maxPrice.toFixed(2)})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ejemplo: 45.50')
            .setRequired(true)
            .setMaxLength(10);

        const firstActionRow = new ActionRowBuilder().addComponents(offerInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Error en handleOfferButton:', error);
        await interaction.reply({
            content: '❌ Error al procesar la oferta.',
            ephemeral: true
        });
    }
};

// Función para manejar el modal de ofertas
export const handleOfferModal = async (interaction) => {
    if (!interaction.customId.startsWith('offer_modal_')) return;

    try {
        const messageId = interaction.customId.replace('offer_modal_', '');
        const auctionData = offerData.get(messageId);

        if (!auctionData) {
            return await interaction.reply({
                content: '❌ Error: No se encontraron datos de esta subasta.',
                ephemeral: true
            });
        }

        const offerAmount = parseFloat(interaction.fields.getTextInputValue('offer_amount'));

        // Validar la oferta
        if (isNaN(offerAmount)) {
            return await interaction.reply({
                content: '❌ Error: Debes ingresar un número válido.',
                ephemeral: true
            });
        }

        if (offerAmount < auctionData.minPrice || offerAmount > auctionData.maxPrice) {
            return await interaction.reply({
                content: `❌ Error: La oferta debe estar entre $${auctionData.minPrice.toFixed(2)} y $${auctionData.maxPrice.toFixed(2)} USD.`,
                ephemeral: true
            });
        }

        if (auctionData.currentOffer && offerAmount <= auctionData.currentOffer) {
            return await interaction.reply({
                content: `❌ Error: Tu oferta debe ser mayor a la actual ($${auctionData.currentOffer.toFixed(2)} USD).`,
                ephemeral: true
            });
        }

        // Verificar si el usuario ha ofertado recientemente
        const hasRecentOffer = await hasUserOfferedRecently(auctionData.auctionId, interaction.user.id, 30000); // 30 segundos
        if (hasRecentOffer) {
            return await interaction.reply({
                content: '❌ Error: Debes esperar 30 segundos antes de hacer otra oferta.',
                ephemeral: true
            });
        }

        // Actualizar datos en la base de datos
        await updateCurrentOffer(auctionData.auctionId, interaction.user.id, interaction.user.displayName, offerAmount);
        
        // Actualizar datos locales usando el handler
        updateAuctionData(messageId, {
            currentOffer: offerAmount,
            currentBidder: interaction.user.id
        });
        auctionData.lastBidders.add(interaction.user.id);

        // Actualizar el embed de ofertas (es el único embed en este mensaje)
        const originalMessage = interaction.message;
        const updatedOfferEmbed = EmbedBuilder.from(originalMessage.embeds[0])
            .setDescription(`**💵 Rango de ofertas:** $${auctionData.minPrice.toFixed(2)} - $${auctionData.maxPrice.toFixed(2)} USD\n\n🔥 **Oferta actual:** $${offerAmount.toFixed(2)} USD\n👤 **Mejor postor:** ${interaction.user.displayName}\n\n⚡ **¡Supera esta oferta!**`);

        await originalMessage.edit({
            embeds: [updatedOfferEmbed],
            components: originalMessage.components
        });

        // Eliminar el embed de notificación anterior si existe
        if (auctionData.lastNotificationId) {
            try {
                const previousNotification = await interaction.channel.messages.fetch(auctionData.lastNotificationId);
                await previousNotification.delete();
            } catch (error) {
                console.log('No se pudo eliminar el mensaje anterior:', error.message);
            }
        }

        // Crear embed de notificación de nueva oferta
        const currentTime = Math.floor(Date.now() / 1000);
        const notificationEmbed = new EmbedBuilder()
            .setColor(0xFF6B35)
            .setTitle('🔥 ¡Nueva Oferta!')
            .addFields(
                { name: '💰 Cantidad:', value: `$${offerAmount.toFixed(2)} USD`, inline: true },
                { name: '👤 Ofertante:', value: interaction.user.displayName, inline: true },
                { name: '⏰ Hora:', value: `<t:${currentTime}:R>`, inline: true }
            )
            .setDescription(`🔥 ¡La competencia se intensifica! • <t:${currentTime}:f>`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

        // Enviar notificación tagueando a todos
        const notificationMessage = await interaction.channel.send({ 
            content: '@everyone',
            embeds: [notificationEmbed] 
        });

        // Actualizar el ID de notificación en la base de datos
        await updateNotificationId(auctionData.auctionId, notificationMessage.id);
        
        // Actualizar el ID del nuevo mensaje de notificación usando el handler
        updateAuctionData(messageId, {
            lastNotificationId: notificationMessage.id
        });

        // Responder al usuario
        await interaction.reply({
            content: `✅ ¡Oferta de $${offerAmount.toFixed(2)} USD registrada exitosamente!`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error en handleOfferModal:', error);
        await interaction.reply({
            content: '❌ Error al procesar la oferta.',
            ephemeral: true
        });
    }
};

// Función para manejar el botón de galería
export const handleGalleryButton = async (interaction) => {
    if (!interaction.customId.startsWith('gallery_ventaoffer_')) return;

    try {
        const galleryData = global.galleryData?.get(interaction.customId);
        
        if (!galleryData) {
            return await interaction.reply({
                content: '❌ Error: No se encontraron datos de la galería.',
                ephemeral: true
            });
        }

        // Permitir que cualquier persona pueda ver la galería
        // Comentado para permitir acceso público a la galería
        // if (galleryData.createdBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        //     return await interaction.reply({
        //         content: '❌ Solo el creador de la subasta puede ver la galería completa.',
        //         ephemeral: true
        //     });
        // }

        // Enviar todas las URLs en un solo mensaje
        const urlsText = galleryData.mediaUrls.map((url, index) => {
            return `**${index + 1}.** ${url}`;
        }).join('\n\n');
        
        const messageContent = `🖼️ **Galería de Medios** (${galleryData.mediaUrls.length} elementos)\n\n${urlsText}`;
        
        // Agregar botón de cerrar
        const closeButton = new ButtonBuilder()
            .setCustomId(`close_gallery_ventaoffer_${interaction.user.id}`)
            .setLabel('❌ Cerrar Galería')
            .setStyle(ButtonStyle.Danger);
        const buttonRow = new ActionRowBuilder().addComponents(closeButton);
        
        await interaction.reply({
            content: messageContent,
            components: [buttonRow],
            ephemeral: true
        });

    } catch (error) {
        console.error('Error en handleGalleryButton:', error);
        await interaction.reply({
            content: '❌ Error al mostrar la galería.',
            ephemeral: true
        });
    }
};

// Función para manejar el botón de cerrar galería
export const handleCloseGallery = async (interaction) => {
    if (!interaction.customId.startsWith('close_gallery_ventaoffer_')) return;

    try {
        await interaction.update({
            content: '✅ Galería cerrada.',
            embeds: [],
            components: []
        });
    } catch (error) {
        console.error('Error en handleCloseGallery:', error);
    }
};

// Exportar los datos de ofertas para uso en otros archivos
export { offerData };