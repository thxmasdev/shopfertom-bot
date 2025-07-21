import { getActiveAuctions } from '../database/database.js';

// Map para almacenar datos de ofertas en memoria (sincronizado con BD)
const offerData = new Map();

// Función para cargar subastas activas desde la base de datos
export async function loadActiveAuctions(client) {
    try {
        const activeAuctions = await getActiveAuctions();
        
        for (const auction of activeAuctions) {
            try {
                // Verificar que el canal existe
                const channel = await client.channels.fetch(auction.channel_id).catch(() => null);
                if (!channel) {
                    console.log(`⚠️ Canal ${auction.channel_id} no encontrado, omitiendo subasta ${auction.id}`);
                    continue;
                }

                // Verificar que los mensajes existen
                const offerMessage = await channel.messages.fetch(auction.message_id).catch(() => null);
                if (!offerMessage) {
                    console.log(`⚠️ Mensaje de oferta ${auction.message_id} no encontrado, omitiendo subasta ${auction.id}`);
                    continue;
                }

                // Cargar datos en memoria
                offerData.set(auction.message_id, {
                    auctionId: auction.id,
                    channelId: auction.channel_id,
                    messageId: auction.message_id,
                    minPrice: auction.min_price,
                    maxPrice: auction.max_price,
                    currentOffer: auction.current_offer,
                    currentBidder: auction.current_bidder,
                    lastBidders: new Set(), // Se reconstruirá con las ofertas
                    createdBy: auction.created_by,
                    createdAt: auction.created_at,
                    lastNotificationId: auction.notification_id
                });

                console.log(`✅ Subasta ${auction.id} cargada en canal ${channel.name}`);
            } catch (error) {
                console.error(`❌ Error cargando subasta ${auction.id}:`, error.message);
            }
        }

        console.log(`📊 ${activeAuctions.length} subastas activas encontradas, ${offerData.size} cargadas exitosamente`);
    } catch (error) {
        console.error('❌ Error cargando subastas activas:', error);
    }
}

// Exportar el Map para uso en otros archivos
export { offerData };

// Función para obtener datos de subasta
export function getAuctionData(messageId) {
    return offerData.get(messageId);
}

// Función para actualizar datos de subasta
export function updateAuctionData(messageId, data) {
    const existing = offerData.get(messageId);
    if (existing) {
        offerData.set(messageId, { ...existing, ...data });
    }
}

// Función para eliminar datos de subasta
export function removeAuctionData(messageId) {
    offerData.delete(messageId);
}