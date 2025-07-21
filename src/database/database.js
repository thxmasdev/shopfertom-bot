import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de la base de datos
let db = null;

// Inicializar la base de datos
export async function initDatabase() {
    try {
        db = await open({
            filename: path.join(__dirname, '../../database.sqlite'),
            driver: sqlite3.Database
        });

        // Crear tabla de subastas
        await db.exec(`
            CREATE TABLE IF NOT EXISTS auctions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                account_embed_id TEXT,
                offer_embed_id TEXT,
                notification_id TEXT,
                min_price REAL NOT NULL,
                max_price REAL NOT NULL,
                current_offer REAL,
                current_bidder_id TEXT,
                created_by TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                status TEXT DEFAULT 'active',
                winner_id TEXT,
                finished_at INTEGER
            )
        `);

        // Crear tabla de ofertas
        await db.exec(`
            CREATE TABLE IF NOT EXISTS offers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                auction_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                amount REAL NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (auction_id) REFERENCES auctions (id)
            )
        `);

        // Crear tabla de vouches
        await db.exec(`
            CREATE TABLE IF NOT EXISTS vouches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                seller_id TEXT NOT NULL,
                seller_name TEXT NOT NULL,
                voucher_id TEXT NOT NULL,
                voucher_name TEXT NOT NULL,
                rating REAL NOT NULL,
                message TEXT,
                created_at INTEGER NOT NULL
            )
        `);

        // Crear tabla para sticky messages
        await db.exec(`
            CREATE TABLE IF NOT EXISTS sticky_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL UNIQUE,
                message_id TEXT NOT NULL,
                type TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `);

        // Crear tabla de sorteos
        await db.exec(`
            CREATE TABLE IF NOT EXISTS giveaways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_by_name TEXT NOT NULL,
                winners_count INTEGER NOT NULL,
                prize TEXT NOT NULL,
                end_time INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                status TEXT DEFAULT 'active'
            )
        `);

        // Crear tabla de participantes de sorteos
        await db.exec(`
            CREATE TABLE IF NOT EXISTS giveaway_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                giveaway_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                joined_at INTEGER NOT NULL,
                FOREIGN KEY (giveaway_id) REFERENCES giveaways (id),
                UNIQUE(giveaway_id, user_id)
            )
        `);

        // Crear tabla de configuración del servidor
        await db.exec(`
            CREATE TABLE IF NOT EXISTS server_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL UNIQUE,
                sales_category_id TEXT,
                seller_role_id TEXT,
                sold_category_id TEXT,
                vouch_channel_id TEXT,
                updated_at INTEGER NOT NULL,
                updated_by TEXT NOT NULL
            )
        `);

        console.log('✅ Base de datos SQLite inicializada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
    }
}

// Crear nueva subasta
export async function createAuction(data) {
    try {
        const result = await db.run(`
            INSERT INTO auctions (
                channel_id, message_id, account_embed_id, offer_embed_id,
                min_price, max_price, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.channelId,
            data.messageId,
            data.accountEmbedId,
            data.offerEmbedId,
            data.minPrice,
            data.maxPrice,
            data.createdBy,
            data.createdAt
        ]);
        
        return result.lastID;
    } catch (error) {
        console.error('Error al crear subasta:', error);
        return null;
    }
}

// Obtener subasta por message_id
export async function getAuctionByMessageId(messageId) {
    try {
        return await db.get('SELECT * FROM auctions WHERE message_id = ? AND status = "active"', [messageId]);
    } catch (error) {
        console.error('Error al obtener subasta:', error);
        return null;
    }
}

// Obtener subasta por channel_id
export async function getAuctionByChannelId(channelId) {
    try {
        return await db.get('SELECT * FROM auctions WHERE channel_id = ? AND status = "active"', [channelId]);
    } catch (error) {
        console.error('Error al obtener subasta por canal:', error);
        return null;
    }
}

// Actualizar oferta actual
export async function updateCurrentOffer(auctionId, userId, userName, amount) {
    try {
        // Actualizar la subasta
        await db.run(`
            UPDATE auctions 
            SET current_offer = ?, current_bidder_id = ?
            WHERE id = ?
        `, [amount, userId, auctionId]);

        // Agregar la oferta al historial
        await db.run(`
            INSERT INTO offers (auction_id, user_id, user_name, amount, created_at)
            VALUES (?, ?, ?, ?, ?)
        `, [auctionId, userId, userName, amount, Date.now()]);

        return true;
    } catch (error) {
        console.error('Error al actualizar oferta:', error);
        return false;
    }
}

// Actualizar ID de notificación
export async function updateNotificationId(auctionId, notificationId) {
    try {
        await db.run('UPDATE auctions SET notification_id = ? WHERE id = ?', [notificationId, auctionId]);
        return true;
    } catch (error) {
        console.error('Error al actualizar notification_id:', error);
        return false;
    }
}

// Finalizar subasta
export async function finishAuction(auctionId, winnerId) {
    try {
        await db.run(`
            UPDATE auctions 
            SET status = 'finished', winner_id = ?, finished_at = ?
            WHERE id = ?
        `, [winnerId, Date.now(), auctionId]);
        return true;
    } catch (error) {
        console.error('Error al finalizar subasta:', error);
        return false;
    }
}

// Función para obtener una subasta por ID
export async function getAuctionById(auctionId) {
    try {
        return await db.get('SELECT * FROM auctions WHERE id = ?', [auctionId]);
    } catch (error) {
        console.error('Error al obtener subasta por ID:', error);
        return null;
    }
}

// Función para obtener todas las subastas activas
export async function getActiveAuctions() {
    try {
        return await db.all('SELECT * FROM auctions WHERE status = "active" ORDER BY created_at DESC');
    } catch (error) {
        console.error('Error al obtener subastas activas:', error);
        return [];
    }
}

// Obtener todas las ofertas de una subasta
export async function getAuctionOffers(auctionId) {
    try {
        return await db.all(`
            SELECT * FROM offers 
            WHERE auction_id = ? 
            ORDER BY created_at ASC
        `, [auctionId]);
    } catch (error) {
        console.error('Error al obtener ofertas:', error);
        return [];
    }
}

// Verificar si un usuario ya ofertó en la ronda actual
export async function hasUserOfferedRecently(auctionId, userId) {
    try {
        const auction = await db.get('SELECT current_bidder_id FROM auctions WHERE id = ?', [auctionId]);
        return auction && auction.current_bidder_id === userId;
    } catch (error) {
        console.error('Error al verificar oferta reciente:', error);
        return false;
    }
}

// Crear nuevo vouch
export async function createVouch(data) {
    try {
        const result = await db.run(`
            INSERT INTO vouches (
                seller_id, seller_name, voucher_id, voucher_name, rating, message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            data.sellerId,
            data.sellerName,
            data.voucherId,
            data.voucherName,
            data.rating,
            data.message,
            data.createdAt
        ]);
        
        return result.lastID;
    } catch (error) {
        console.error('Error al crear vouch:', error);
        return null;
    }
}

// Obtener estadísticas de vouches globales (toda la tienda)
export async function getVouchStats() {
    try {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_vouches,
                AVG(rating) as average_rating
            FROM vouches
        `);
        
        return {
            totalVouches: stats.total_vouches || 0,
            averageRating: stats.average_rating || 0
        };
    } catch (error) {
        console.error('Error al obtener estadísticas de vouches:', error);
        return { totalVouches: 0, averageRating: 0 };
    }
}

// Obtener estadísticas de vouches de un vendedor específico
export async function getSellerVouchStats(sellerId) {
    try {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_vouches,
                AVG(rating) as average_rating
            FROM vouches
            WHERE seller_id = ?
        `, [sellerId]);
        
        return {
            totalVouches: stats.total_vouches || 0,
            averageRating: stats.average_rating || 0
        };
    } catch (error) {
        console.error('Error al obtener estadísticas de vouches del vendedor:', error);
        return { totalVouches: 0, averageRating: 0 };
    }
}

// Actualizar o crear sticky message
export async function updateStickyMessage(channelId, messageId, type) {
    try {
        await db.run(`
            INSERT OR REPLACE INTO sticky_messages (channel_id, message_id, type, updated_at)
            VALUES (?, ?, ?, ?)
        `, [channelId, messageId, type, Date.now()]);
        
        return true;
    } catch (error) {
        console.error('Error al actualizar sticky message:', error);
        return false;
    }
}

// Obtener sticky message
export async function getStickyMessage(channelId, type) {
    try {
        return await db.get(
            'SELECT * FROM sticky_messages WHERE channel_id = ? AND type = ?',
            [channelId, type]
        );
    } catch (error) {
        console.error('Error al obtener sticky message:', error);
        return null;
    }
}

// ===== FUNCIONES DE SORTEOS =====

// Crear nuevo sorteo
export async function createGiveaway(data) {
    try {
        const result = await db.run(`
            INSERT INTO giveaways (
                channel_id, message_id, created_by, created_by_name,
                winners_count, prize, end_time, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.channelId,
            data.messageId,
            data.createdBy,
            data.createdByName,
            data.winnersCount,
            data.prize,
            data.endTime,
            data.createdAt
        ]);
        
        return result.lastID;
    } catch (error) {
        console.error('Error al crear sorteo:', error);
        return null;
    }
}

// Obtener sorteo por message_id
export async function getGiveawayByMessageId(messageId) {
    try {
        return await db.get('SELECT * FROM giveaways WHERE message_id = ? AND status = "active"', [messageId]);
    } catch (error) {
        console.error('Error al obtener sorteo:', error);
        return null;
    }
}

// Agregar participante al sorteo
export async function addGiveawayParticipant(giveawayId, userId, userName) {
    try {
        await db.run(`
            INSERT INTO giveaway_participants (giveaway_id, user_id, user_name, joined_at)
            VALUES (?, ?, ?, ?)
        `, [giveawayId, userId, userName, Date.now()]);
        return true;
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return false; // Usuario ya está participando
        }
        console.error('Error al agregar participante:', error);
        return false;
    }
}

// Remover participante del sorteo
export async function removeGiveawayParticipant(giveawayId, userId) {
    try {
        const result = await db.run(`
            DELETE FROM giveaway_participants 
            WHERE giveaway_id = ? AND user_id = ?
        `, [giveawayId, userId]);
        return result.changes > 0;
    } catch (error) {
        console.error('Error al remover participante:', error);
        return false;
    }
}

// Obtener número de participantes
export async function getGiveawayParticipantCount(giveawayId) {
    try {
        const result = await db.get(`
            SELECT COUNT(*) as count 
            FROM giveaway_participants 
            WHERE giveaway_id = ?
        `, [giveawayId]);
        return result.count || 0;
    } catch (error) {
        console.error('Error al contar participantes:', error);
        return 0;
    }
}

// Verificar si un usuario está participando
export async function isUserParticipating(giveawayId, userId) {
    try {
        const result = await db.get(`
            SELECT id FROM giveaway_participants 
            WHERE giveaway_id = ? AND user_id = ?
        `, [giveawayId, userId]);
        return !!result;
    } catch (error) {
        console.error('Error al verificar participación:', error);
        return false;
    }
}

// Obtener todos los participantes de un sorteo
export async function getGiveawayParticipants(giveawayId) {
    try {
        return await db.all(`
            SELECT user_id, user_name, joined_at 
            FROM giveaway_participants 
            WHERE giveaway_id = ?
            ORDER BY joined_at ASC
        `, [giveawayId]);
    } catch (error) {
        console.error('Error al obtener participantes:', error);
        return [];
    }
}

// Finalizar sorteo
export async function finishGiveaway(giveawayId) {
    try {
        await db.run(`
            UPDATE giveaways 
            SET status = 'finished'
            WHERE id = ?
        `, [giveawayId]);
        return true;
    } catch (error) {
        console.error('Error al finalizar sorteo:', error);
        return false;
    }
}

// Obtener sorteos activos
export async function getActiveGiveaways() {
    try {
        return await db.all('SELECT * FROM giveaways WHERE status = "active" ORDER BY created_at DESC');
    } catch (error) {
        console.error('Error al obtener sorteos activos:', error);
        return [];
    }
}

// ===== FUNCIONES DE CONFIGURACIÓN DEL SERVIDOR =====

// Actualizar configuración del servidor
export async function updateServerConfig(guildId, config, updatedBy) {
    try {
        await db.run(`
            INSERT OR REPLACE INTO server_config (
                guild_id, sales_category_id, seller_role_id, 
                sold_category_id, vouch_channel_id, updated_at, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            guildId,
            config.salesCategoryId,
            config.sellerRoleId,
            config.soldCategoryId,
            config.vouchChannelId,
            Date.now(),
            updatedBy
        ]);
        return true;
    } catch (error) {
        console.error('Error al actualizar configuración del servidor:', error);
        return false;
    }
}

// Obtener configuración del servidor
export async function getServerConfig(guildId) {
    try {
        return await db.get('SELECT * FROM server_config WHERE guild_id = ?', [guildId]);
    } catch (error) {
        console.error('Error al obtener configuración del servidor:', error);
        return null;
    }
}

export { db };