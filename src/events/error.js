import { Events } from 'discord.js';

export default {
    name: Events.Error,
    
    async execute(error) {
        console.error('❌ Error del cliente de Discord:', error);
        
        // Aquí puedes agregar lógica adicional como:
        // - Enviar el error a un canal de logs
        // - Guardar el error en una base de datos
        // - Enviar notificaciones a los desarrolladores
        
        // Ejemplo de diferentes tipos de errores comunes
        if (error.code === 'ENOTFOUND') {
            console.error('🌐 Error de conexión: No se pudo conectar a Discord.');
        } else if (error.code === 'ECONNRESET') {
            console.error('🔄 Conexión reiniciada: Reintentando conexión...');
        } else if (error.message.includes('401')) {
            console.error('🔑 Token inválido: Verifica tu token de Discord.');
        } else if (error.message.includes('403')) {
            console.error('🚫 Permisos insuficientes: El bot no tiene los permisos necesarios.');
        } else if (error.message.includes('429')) {
            console.error('⏰ Rate limit: El bot está siendo limitado por Discord.');
        }
    },
};