import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carga eventos recursivamente desde un directorio
 * @param {string} directory - Directorio a escanear
 * @param {Client} client - Cliente de Discord
 * @param {string} relativePath - Ruta relativa para logging
 */
async function loadEventsFromDirectory(directory, client, relativePath = '') {
    try {
        const files = fs.readdirSync(directory);
        
        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // Si es un directorio, cargar recursivamente
                const newRelativePath = relativePath ? `${relativePath}\\${file}` : file;
                await loadEventsFromDirectory(filePath, client, newRelativePath);
            } else if (file.endsWith('.js')) {
                try {
                    // Importar el evento
                    const eventModule = await import(`file:///${filePath.replace(/\\/g, '/')}`);
                    const event = eventModule.default;
                    
                    if (event && event.name && event.execute) {
                        // Registrar el evento
                        if (event.once) {
                            client.once(event.name, (...args) => event.execute(...args));
                        } else {
                            client.on(event.name, (...args) => event.execute(...args));
                        }
                        
                        const displayPath = relativePath ? `${relativePath}\\${file}` : file;
                        console.log(`✅ Evento cargado: ${event.name} (${displayPath})`);
                    } else {
                        console.warn(`⚠️ El archivo ${file} no exporta un evento válido`);
                    }
                } catch (error) {
                    console.error(`❌ Error al cargar evento ${file}:`, error.message);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error al leer directorio ${directory}:`, error.message);
    }
}

/**
 * Inicializa y carga todos los eventos
 * @param {Client} client - Cliente de Discord
 */
export async function loadEvents(client) {
    console.log('📂 Cargando eventos...');
    
    // Ruta al directorio de eventos
    const eventsPath = path.join(__dirname, '..', 'events');
    
    console.log(`📂 Buscando eventos en: ${eventsPath}`);
    
    // Verificar si el directorio existe
    if (!fs.existsSync(eventsPath)) {
        console.error(`❌ El directorio de eventos no existe: ${eventsPath}`);
        return;
    }
    
    // Cargar eventos
    await loadEventsFromDirectory(eventsPath, client);
    
    console.log(`✅ Eventos cargados exitosamente`);
}

export default { loadEvents };