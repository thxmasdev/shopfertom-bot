import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carga comandos recursivamente desde un directorio
 * @param {string} directory - Directorio a escanear
 * @param {Collection} commands - Colección de comandos
 * @param {string} relativePath - Ruta relativa para logging
 */
async function loadCommandsFromDirectory(directory, commands, relativePath = '') {
    try {
        const files = fs.readdirSync(directory);
        
        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // Si es un directorio, cargar recursivamente
                const newRelativePath = relativePath ? `${relativePath}\\${file}` : file;
                await loadCommandsFromDirectory(filePath, commands, newRelativePath);
            } else if (file.endsWith('.js')) {
                try {
                    // Importar el comando
                    const commandModule = await import(`file:///${filePath.replace(/\\/g, '/')}`);
                    const command = commandModule.default;
                    
                    if (command && command.data && command.execute) {
                        commands.set(command.data.name, command);
                        const displayPath = relativePath ? `${relativePath}\\${file}` : file;
                        console.log(`✅ Comando cargado: ${command.data.name} (${displayPath})`);
                    } else {
                        console.warn(`⚠️ El archivo ${file} no exporta un comando válido`);
                    }
                } catch (error) {
                    console.error(`❌ Error al cargar comando ${file}:`, error.message);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error al leer directorio ${directory}:`, error.message);
    }
}

/**
 * Inicializa y carga todos los comandos
 * @param {Client} client - Cliente de Discord
 */
export async function loadCommands(client) {
    console.log('📂 Cargando comandos...');
    
    // Crear colección de comandos
    client.commands = new Collection();
    
    // Ruta al directorio de comandos
    const commandsPath = path.join(__dirname, '..', 'commands');
    
    console.log(`📂 Buscando comandos en: ${commandsPath}`);
    
    // Verificar si el directorio existe
    if (!fs.existsSync(commandsPath)) {
        console.error(`❌ El directorio de comandos no existe: ${commandsPath}`);
        return;
    }
    
    // Cargar comandos
    await loadCommandsFromDirectory(commandsPath, client.commands);
    
    console.log(`✅ ${client.commands.size} comandos cargados exitosamente`);
}

export default { loadCommands };