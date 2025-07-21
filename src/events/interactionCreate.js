import { Events } from 'discord.js';
import { handleOfferButton, handleOfferModal, handleGalleryButton as handleVentaOfferGallery, handleCloseGallery as handleVentaOfferClose } from '../commands/admin/ventaoffer.js';
import { handleHistoryNavigation } from '../commands/admin/finalizaroffer.js';
import { handleGiveawayButton, handleGiveawayLeave } from '../commands/admin/sorteo.js';
import { handleGalleryButton as handleVentaGallery, handleCloseGallery as handleVentaClose } from '../commands/admin/venta.js';
import vouchmeCommand from '../commands/admin/vouchme.js';

const { handleVouchButton, handleVouchModal } = vouchmeCommand;

export default {
    name: Events.InteractionCreate,
    
    async execute(interaction) {
        // Manejar comandos de barra
        if (interaction.isChatInputCommand()) {
            // Obtener el comando de la colección
            const command = interaction.client.commands.get(interaction.commandName);
            
            // Verificar si el comando existe
            if (!command) {
                console.error(`❌ No se encontró el comando ${interaction.commandName}.`);
                return;
            }
            
            try {
                // Registrar el uso del comando
                console.log(`📝 ${interaction.user.tag} ejecutó /${interaction.commandName} en ${interaction.guild?.name || 'DM'}`);
                
                // Ejecutar el comando
                await command.execute(interaction);
                
            } catch (error) {
                console.error(`❌ Error al ejecutar el comando ${interaction.commandName}:`, error);
                
                // Responder con un mensaje de error al usuario
                const errorMessage = {
                    content: '❌ Ocurrió un error al ejecutar este comando. Por favor, inténtalo de nuevo más tarde.',
                    ephemeral: true
                };
                
                try {
                    if (interaction.deferred) {
                        await interaction.editReply(errorMessage);
                    } else if (interaction.replied) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (followUpError) {
                    console.error('❌ Error al enviar mensaje de error:', followUpError);
                }
            }
        }
        
        // Manejar interacciones de botones
        else if (interaction.isButton()) {
            console.log(`🔘 Botón presionado por ${interaction.user.tag}: ${interaction.customId}`);
            
            try {
                // Manejar botones del comando ventaoffer
                if (interaction.customId === 'make_offer') {
                    await handleOfferButton(interaction);
                }
                // Manejar botones de galería de ventaoffer
                else if (interaction.customId.startsWith('gallery_ventaoffer_')) {
                    await handleVentaOfferGallery(interaction);
                }
                else if (interaction.customId.startsWith('close_gallery_ventaoffer_')) {
                    await handleVentaOfferClose(interaction);
                }
                // Manejar botones de galería de venta
                else if (interaction.customId.startsWith('gallery_venta_')) {
                    await handleVentaGallery(interaction);
                }
                else if (interaction.customId.startsWith('close_gallery_venta_')) {
                    await handleVentaClose(interaction);
                }
                // Manejar botones de navegación del historial
                else if (interaction.customId.startsWith('history_')) {
                    await handleHistoryNavigation(interaction);
                }
                // Manejar botones del sistema de vouches
                else if (interaction.customId.startsWith('vouch_')) {
                    await handleVouchButton(interaction);
                }
                // Manejar botones del sistema de sorteos
                else if (interaction.customId === 'giveaway_join') {
                    await handleGiveawayButton(interaction);
                }
                else if (interaction.customId === 'giveaway_leave') {
                    await handleGiveawayLeave(interaction);
                }
            } catch (error) {
                console.error('❌ Error al manejar interacción de botón:', error);
                
                const errorMessage = {
                    content: '❌ Ocurrió un error al procesar la interacción.',
                    ephemeral: true
                };
                
                try {
                    if (interaction.deferred) {
                        await interaction.editReply(errorMessage);
                    } else if (interaction.replied) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (followUpError) {
                    console.error('❌ Error al enviar mensaje de error:', followUpError);
                }
            }
        }
        
        // Manejar interacciones de modales
        else if (interaction.isModalSubmit()) {
            console.log(`📝 Modal enviado por ${interaction.user.tag}: ${interaction.customId}`);
            
            try {
                // Manejar modales del comando ventaoffer
                if (interaction.customId.startsWith('offer_modal_')) {
                    await handleOfferModal(interaction);
                }
                // Manejar modales del sistema de vouches
                else if (interaction.customId.startsWith('vouch_modal_')) {
                    await handleVouchModal(interaction);
                }
            } catch (error) {
                console.error('❌ Error al manejar modal:', error);
                
                const errorMessage = {
                    content: '❌ Ocurrió un error al procesar el modal.',
                    ephemeral: true
                };
                
                try {
                    if (interaction.deferred) {
                        await interaction.editReply(errorMessage);
                    } else if (interaction.replied) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (followUpError) {
                    console.error('❌ Error al enviar mensaje de error:', followUpError);
                }
            }
        }
        
        // Manejar otros tipos de interacciones (select menus, etc.)
        else if (interaction.isStringSelectMenu()) {
            console.log(`📋 Select menu usado por ${interaction.user.tag}: ${interaction.customId}`);
        }
    },
};