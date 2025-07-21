import { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getServerConfig } from '../../database/database.js';

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
        .setName('venta')
        .setDescription('Crear una publicación de venta de cuenta de Minecraft')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(option =>
            option.setName('precio')
                .setDescription('Precio en USD (ejemplo: 45.99)')
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
            const precio = interaction.options.getString('precio') || '';
            const cosmeticos = interaction.options.getString('lunar_cosmetics') || '';
            const ranks = interaction.options.getString('rank') || '';
            const capes = interaction.options.getString('capes') || '';
            const metodosPago = interaction.options.getString('metodos') || '';
            const fotos = interaction.options.getString('imagenes') || '';

            // Crear el embed principal con emojis personalizados
            const shopEmoji = getEmoji('shop', '🏪');
            const verifyEmoji = getEmoji('verify', '✅');
            const minecraftEmoji = getEmoji('minecraft', '🎮');
            
            const embed = new EmbedBuilder()
                .setColor(0x00D4AA)
                .setTitle(`Cuenta de Minecraft - $${precio} USD`)

            // Agregar información básica con emojis personalizados
            const cosmeticsEmoji = getEmoji('cosmetics', '✨');
            const rankEmoji = getEmoji('rank', '🏆');
            const capesEmoji = getEmoji('capes', '👘');
            const paymentEmoji = getEmoji('payment', '💳');
            
            if (nick) {
                embed.addFields({
                    name: `${minecraftEmoji} Nickname`,
                    value: `\`${nick}\``,
                    inline: false
                });
            }

            if (cosmeticos) {
                embed.addFields({
                    name: `${cosmeticsEmoji} Lunar Cosmetics`,
                    value: `\`$${cosmeticos}\``,
                    inline: false
                });
            }

            if (ranks) {
                embed.addFields({
                    name: `${rankEmoji} Ranks`,
                    value: `\`${ranks.replace(/,\s*/g, ',\n')}\``,
                    inline: false
                });
            }

            if (capes) {
                embed.addFields({
                    name: `${capesEmoji} Capas`,
                    value: capes,
                    inline: false
                });
            }

            if (metodosPago) {
                embed.addFields({
                    name: `${paymentEmoji} Métodos de Pago`,
                    value: metodosPago.replace(/,\s*/g, ',\n'),
                    inline: false
                });
            }

            // Función para obtener render 3D de Minecraft
        const getMinecraftRender = async (nickname) => {
            try {
                // Usar VZGE para renders 3D de alta calidad con todas las características
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
                        embed.setThumbnail(render3D);
                    }
                } catch (error) {
                    console.error('Error generando render 3D:', error);
                }
            }

            // Configurar imagen principal con URLs proporcionadas (abajo)
            if (mediaUrls.length > 0) {
                embed.setImage(mediaUrls[0]);
            }

            // Footer simple con emoji personalizado
            const sellerEmoji = getEmoji('seller', '👤');
            embed.setFooter({ 
                text: `Venta hecha por ${interaction.user.displayName}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

            // Crear botones
            const components = [];
            const buttons = [];
            
            if (nick) {
                const nameMCButton = new ButtonBuilder()
                    .setLabel('🔗 Ver en NameMC')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://es.namemc.com/profile/${nick}`);
                buttons.push(nameMCButton);
            }
            
            let galleryId = null;
            if (mediaUrls.length > 1) {
                galleryId = `gallery_venta_${interaction.user.id}_${Date.now()}`;
                const galleryButton = new ButtonBuilder()
                    .setCustomId(galleryId)
                    .setLabel(`🖼️ Ver todas las imágenes (${mediaUrls.length})`)
                    .setStyle(ButtonStyle.Success);
                buttons.push(galleryButton);
            }
            
            if (buttons.length > 0) {
                const buttonRow = new ActionRowBuilder().addComponents(buttons);
                components.push(buttonRow);
            }

            // Crear canal en la categoría de ventas
            const salesCategoryId = serverConfig?.sales_category_id;
            let newChannel = null;

            if (salesCategoryId && precio) {
                try {
                    const guild = interaction.guild;
                    const category = guild.channels.cache.get(salesCategoryId);

                    if (category && category.type === ChannelType.GuildCategory) {
                        // Nombre del canal basado en el precio
                        const channelName = `${precio}-minecraft`;

                        // Buscar posición correcta basada en el precio
                        const existingChannels = category.children.cache
                            .filter(channel => channel.type === ChannelType.GuildText)
                            .sort((a, b) => {
                                const priceA = parseFloat(a.name.split('-')[0]) || 0;
                                const priceB = parseFloat(b.name.split('-')[0]) || 0;
                                return priceB - priceA; // Orden descendente
                            });

                        let position = 0;
                        const currentPrice = parseFloat(precio);
                        
                        for (const channel of existingChannels.values()) {
                            const channelPrice = parseFloat(channel.name.split('-')[0]) || 0;
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
                            topic: `Venta de cuenta Minecraft - $${precio} USD`,
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

            // Enviar el embed
            const channelToSend = newChannel || interaction.channel;
            const sentMessage = await channelToSend.send({
                embeds: [embed],
                components: components
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

            // Responder al usuario
            const responseMessage = newChannel 
                ? `✅ ¡Venta publicada exitosamente en ${newChannel}!`
                : '✅ ¡Venta publicada exitosamente!';
            
            await interaction.editReply({
                content: responseMessage,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error en el comando venta:', error);
            
            try {
                await interaction.editReply({
                    content: '❌ Ocurrió un error al procesar la venta.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Error al enviar respuesta de error:', replyError);
            }
        }
    }
};

// Función para manejar el botón de galería
export const handleGalleryButton = async (interaction) => {
    if (!interaction.customId.startsWith('gallery_venta_')) return;

    try {
        const galleryData = global.galleryData?.get(interaction.customId);
        
        if (!galleryData) {
            return await interaction.reply({
                content: '❌ Error: No se encontraron datos de la galería.',
                ephemeral: true
            });
        }

        // Verificar que el usuario que creó la venta pueda ver la galería
        if (galleryData.createdBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return await interaction.reply({
                content: '❌ Solo el creador de la venta puede ver la galería completa.',
                ephemeral: true
            });
        }

        // Crear botón para cerrar la galería
        const closeButton = new ButtonBuilder()
            .setCustomId(`close_gallery_venta_${interaction.user.id}`)
            .setLabel('❌ Cerrar Galería')
            .setStyle(ButtonStyle.Danger);

        const buttonRow = new ActionRowBuilder().addComponents(closeButton);

        // Enviar mensaje inicial con información de la galería
        await interaction.reply({
            content: `🖼️ **Galería de Medios** (${galleryData.mediaUrls.length} elementos)\n\n*Las imágenes, videos y GIFs se mostrarán a continuación en alta calidad:*`,
            components: [buttonRow],
            ephemeral: true
        });

        // Enviar cada URL directamente para que Discord las renderice automáticamente
        const maxUrlsPerMessage = 5; // Límite para evitar spam
        
        for (let i = 0; i < galleryData.mediaUrls.length; i += maxUrlsPerMessage) {
            const urlBatch = galleryData.mediaUrls.slice(i, i + maxUrlsPerMessage);
            const urlsText = urlBatch.map((url, index) => {
                const globalIndex = i + index + 1;
                return `**${globalIndex}.** ${url}`;
            }).join('\n\n');
            
            await interaction.followUp({
                content: urlsText,
                ephemeral: true
            });
            
            // Pequeña pausa para evitar rate limiting
            if (i + maxUrlsPerMessage < galleryData.mediaUrls.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

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
    if (!interaction.customId.startsWith('close_gallery_venta_')) return;

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

// Función para manejar modales (ya no se usa pero se mantiene por compatibilidad)
export const handleModal = async (interaction) => {
    // Esta función ya no se usa con el nuevo sistema de comandos slash
    return;
};