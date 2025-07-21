import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { getAuctionByChannelId, getServerConfig } from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('vendida')
        .setDescription('Marca una cuenta como vendida y mueve el canal a la categoría de vendidos')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal de la venta a marcar como vendida')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)),

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

            const channel = interaction.options.getChannel('canal');
            // Obtener la configuración del servidor
            const soldCategoryId = serverConfig?.sold_category_id;

            // Verificar que existe la categoría de vendidos
            if (!soldCategoryId || soldCategoryId.trim() === '') {
                return await interaction.editReply({
                    content: '❌ La categoría de cuentas vendidas no está configurada en el archivo .env (SOLD_CATEGORY_ID).',
                });
            }

            const guild = interaction.guild;
            const soldCategory = guild.channels.cache.get(soldCategoryId);

            if (!soldCategory || soldCategory.type !== ChannelType.GuildCategory) {
                return await interaction.editReply({
                    content: '❌ La categoría de cuentas vendidas no existe o no es válida.',
                });
            }

            // Verificar que el canal existe y es de texto
            if (!channel || channel.type !== ChannelType.GuildText) {
                return await interaction.editReply({
                    content: '❌ El canal especificado no existe o no es un canal de texto.',
                });
            }

            // Obtener información del canal para determinar el nuevo nombre
            const currentName = channel.name;
            let newChannelName;
            let originalPrice = 'precio-desconocido';

            // Verificar si es un canal de subasta
            const auction = await getAuctionByChannelId(channel.id);
            if (auction) {
                newChannelName = `【💲SOLD】minecraft`;
                originalPrice = `$${auction.starting_price} (subasta)`;
            } else {
                // Extraer precio del nombre del canal con el nuevo formato 【💲precio】minecraft
                const priceMatch = currentName.match(/【💲(\d+(?:\.\d+)?)】/);
                if (priceMatch) {
                    const price = priceMatch[1];
                    newChannelName = `【💲SOLD】minecraft`;
                    originalPrice = `$${price}`;
                } else {
                    // Fallback para formato antiguo
                    const oldPriceMatch = currentName.match(/^(\d+(?:\.\d+)?)/); 
                    if (oldPriceMatch) {
                        const price = oldPriceMatch[1];
                        newChannelName = `【💲SOLD】minecraft`;
                        originalPrice = `$${price}`;
                    } else {
                        // Si no se puede extraer precio, usar nombre genérico
                        newChannelName = `【💲SOLD】minecraft`;
                        originalPrice = 'Precio no especificado';
                    }
                }
            }

            // Crear embed de confirmación de venta
            const soldEmbed = new EmbedBuilder()
                .setTitle('✅ ¡CUENTA VENDIDA!')
                .setDescription(`🎉 **Esta cuenta ha sido vendida exitosamente**\n\n💰 **Precio:** ${originalPrice}\n📅 **Fecha de venta:** <t:${Math.floor(Date.now() / 1000)}:F>\n👤 **Vendedor:** ${interaction.user}\n\n🔒 **Este canal ha sido archivado en la categoría de vendidos.**`)
                .setColor('#00FF00')
                .setThumbnail('https://cdn.discordapp.com/emojis/1234567890123456789.png') // Emoji de check verde
                .setFooter({ 
                    text: 'ShopFertom Bot', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTimestamp();

            // Enviar embed en el canal antes de moverlo
            await channel.send({ embeds: [soldEmbed] });

            // Mover el canal a la categoría de vendidos
            await channel.setParent(soldCategory, {
                reason: `Cuenta marcada como vendida por ${interaction.user.tag}`
            });

            // Cambiar el nombre del canal
            await channel.setName(newChannelName, {
                reason: `Cuenta vendida - renombrado por ${interaction.user.tag}`
            });

            // Archivar el canal (solo lectura)
            await channel.setArchived(true).catch(() => {
                // Si no se puede archivar (no es un hilo), intentar bloquear permisos
                channel.permissionOverwrites.edit(guild.roles.everyone, {
                    SendMessages: false,
                    AddReactions: false
                }).catch(console.error);
            });

            await interaction.editReply({
                content: `✅ **Cuenta marcada como vendida exitosamente**\n\n📋 **Detalles:**\n• Canal movido a: ${soldCategory.name}\n• Nuevo nombre: \`${newChannelName}\`\n• Precio: ${originalPrice}\n• Embed de confirmación enviado al canal`,
            });

        } catch (error) {
            console.error('Error al marcar cuenta como vendida:', error);
            
            const errorMessage = '❌ Ocurrió un error al marcar la cuenta como vendida. Verifica que tengo permisos para mover canales y gestionar la categoría de vendidos.';
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: errorMessage,
                });
            }
        }
    },
};