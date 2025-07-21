import { REST, Routes, Collection } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar variables de entorno
dotenv.config();

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
                        console.log(`✅ Comando preparado: ${command.data.name} (${displayPath})`);
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

async function deployCommands() {
    try {
        console.log('🔄 Iniciando despliegue de comandos slash...');
        
        // Crear colección de comandos
        const commands = new Collection();
        
        // Ruta al directorio de comandos
        const commandsPath = path.join(__dirname, 'src', 'commands');
        
        console.log(`📂 Buscando comandos en: ${commandsPath}`);
        
        // Verificar si el directorio existe
        if (!fs.existsSync(commandsPath)) {
            console.error(`❌ El directorio de comandos no existe: ${commandsPath}`);
            return;
        }
        
        // Cargar comandos
        await loadCommandsFromDirectory(commandsPath, commands);
        
        if (commands.size === 0) {
            console.log('⚠️ No se encontraron comandos válidos para desplegar.');
            return;
        }
        
        // Convertir comandos a JSON
        const commandsArray = commands.map(command => command.data.toJSON());
        
        // Verificar variables de entorno
        if (!process.env.DISCORD_TOKEN) {
            throw new Error('❌ DISCORD_TOKEN no encontrado en el archivo .env');
        }
        
        if (!process.env.CLIENT_ID) {
            throw new Error('❌ CLIENT_ID no encontrado en el archivo .env');
        }
        
        // Construir y preparar una instancia del módulo REST
        const rest = new REST().setToken(process.env.DISCORD_TOKEN);
        
        // Desplegar los comandos
        console.log(`🚀 Desplegando ${commandsArray.length} comandos slash...`);
        
        let data;
        if (process.env.GUILD_ID) {
            // Desplegar comandos a un servidor específico (más rápido para desarrollo)
            console.log(`📍 Desplegando comandos al servidor: ${process.env.GUILD_ID}`);
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandsArray }
            );
        } else {
            // Desplegar comandos globalmente (puede tardar hasta 1 hora)
            console.log('🌍 Desplegando comandos globalmente...');
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commandsArray }
            );
        }
        
        console.log(`✅ ${data.length} comandos slash desplegados exitosamente.`);
        
    } catch (error) {
        console.error('❌ Error al desplegar comandos:', error);
        
        if (error.code === 50001) {
            console.error('💡 Error: Acceso faltante. Verifica que el bot tenga permisos de aplicaciones.comandos en el servidor.');
        } else if (error.code === 10002) {
            console.error('💡 Error: Aplicación desconocida. Verifica que CLIENT_ID sea correcto.');
        } else if (error.status === 401) {
            console.error('💡 Error: Token inválido. Verifica que DISCORD_TOKEN sea correcto.');
        }
        
        process.exit(1);
    }
}

// Ejecutar el despliegue
deployCommands();