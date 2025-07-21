import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { updateServerConfig } from '../../database/database.js';

function getEmoji(name) {
    const emojis = {
        success: '✅',
        error: '❌',
        settings: '⚙️',
        category: '📁',
        role: '👤',
        channel: '💬'
    };
    return emojis[name] || '❓';
}

export default {
    data: new SlashCommandBuilder()
        .setName('set')
        .setDescription('Configurar IDs de categorías, roles y canales del servidor')
        .addStringOption(option =>
            option.setName('sales_category_id')
                .setDescription('ID de la categoría de ventas')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('seller_role_id')
                .setDescription('ID del rol de vendedor')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('sold_category_id')
                .setDescription('ID de la categoría de cuentas vendidas')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('vouch_channel_id')
                .setDescription('ID del canal de vouches')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const salesCategoryId = interaction.options.getString('sales_category_id');
            const sellerRoleId = interaction.options.getString('seller_role_id');
            const soldCategoryId = interaction.options.getString('sold_category_id');
            const vouchChannelId = interaction.options.getString('vouch_channel_id');

            // Validar que los IDs sean válidos (solo números)
            const idPattern = /^\d{17,19}$/;
            const ids = {
                'Categoría de Ventas': salesCategoryId,
                'Rol de Vendedor': sellerRoleId,
                'Categoría de Vendidas': soldCategoryId,
                'Canal de Vouches': vouchChannelId
            };

            for (const [name, id] of Object.entries(ids)) {
                if (!idPattern.test(id)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle(`${getEmoji('error')} Error de Validación`)
                        .setDescription(`El ID de **${name}** no es válido.\n\n**ID proporcionado:** \`${id}\`\n**Formato esperado:** Un número de 17-19 dígitos`)
                        .setFooter({ text: 'ShopFertom Bot', iconURL: interaction.client.user.displayAvatarURL() })
                        .setTimestamp();

                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }

            // Verificar que los elementos existan en el servidor
            const guild = interaction.guild;
            const validationErrors = [];

            // Verificar categorías
            const salesCategory = guild.channels.cache.get(salesCategoryId);
            if (!salesCategory || salesCategory.type !== 4) {
                validationErrors.push(`${getEmoji('category')} Categoría de Ventas (${salesCategoryId}) no encontrada`);
            }

            const soldCategory = guild.channels.cache.get(soldCategoryId);
            if (!soldCategory || soldCategory.type !== 4) {
                validationErrors.push(`${getEmoji('category')} Categoría de Vendidas (${soldCategoryId}) no encontrada`);
            }

            // Verificar rol
            const sellerRole = guild.roles.cache.get(sellerRoleId);
            if (!sellerRole) {
                validationErrors.push(`${getEmoji('role')} Rol de Vendedor (${sellerRoleId}) no encontrado`);
            }

            // Verificar canal
            const vouchChannel = guild.channels.cache.get(vouchChannelId);
            if (!vouchChannel || vouchChannel.type !== 0) {
                validationErrors.push(`${getEmoji('channel')} Canal de Vouches (${vouchChannelId}) no encontrado`);
            }

            if (validationErrors.length > 0) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${getEmoji('error')} Elementos No Encontrados`)
                    .setDescription(`Los siguientes elementos no se encontraron en el servidor:\n\n${validationErrors.join('\n')}`)
                    .setFooter({ text: 'ShopFertom Bot', iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();

                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Guardar configuración en la base de datos
            const config = {
                salesCategoryId,
                sellerRoleId,
                soldCategoryId,
                vouchChannelId
            };

            const success = await updateServerConfig(guild.id, config, interaction.user.id);

            if (!success) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${getEmoji('error')} Error de Base de Datos`)
                    .setDescription('No se pudo guardar la configuración en la base de datos.')
                    .setFooter({ text: 'ShopFertom Bot', iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();

                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Embed de confirmación
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${getEmoji('success')} Configuración Actualizada`)
                .setDescription(`${getEmoji('settings')} La configuración del servidor ha sido actualizada exitosamente.`)
                .addFields(
                    {
                        name: `${getEmoji('category')} Categoría de Ventas`,
                        value: `${salesCategory.name} (\`${salesCategoryId}\`)`,
                        inline: true
                    },
                    {
                        name: `${getEmoji('role')} Rol de Vendedor`,
                        value: `${sellerRole.name} (\`${sellerRoleId}\`)`,
                        inline: true
                    },
                    {
                        name: `${getEmoji('category')} Categoría de Vendidas`,
                        value: `${soldCategory.name} (\`${soldCategoryId}\`)`,
                        inline: true
                    },
                    {
                        name: `${getEmoji('channel')} Canal de Vouches`,
                        value: `${vouchChannel.name} (\`${vouchChannelId}\`)`,
                        inline: true
                    },
                    {
                        name: '👤 Configurado por',
                        value: `${interaction.user.tag}`,
                        inline: true
                    },
                    {
                        name: '📅 Fecha',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    }
                )
                .setFooter({ text: 'ShopFertom Bot', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error en comando set:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`${getEmoji('error')} Error Interno`)
                .setDescription('Ocurrió un error interno al procesar el comando.')
                .setFooter({ text: 'ShopFertom Bot', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};