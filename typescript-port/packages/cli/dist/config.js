/**
 * CLI Configuration Management
 *
 * Stores user session data and CLI settings
 */
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
const CONFIG_DIR = join(homedir(), '.osvauld');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
/**
 * Ensures config directory exists
 */
function ensureConfigDir() {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
}
/**
 * Loads CLI configuration
 */
export function loadConfig() {
    ensureConfigDir();
    if (!existsSync(CONFIG_FILE)) {
        return {};
    }
    try {
        const data = readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch {
        return {};
    }
}
/**
 * Saves CLI configuration
 */
export function saveConfig(config) {
    ensureConfigDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
/**
 * Gets database path
 */
export function getDbPath() {
    const config = loadConfig();
    return config.dbPath || join(CONFIG_DIR, 'osvauld.db');
}
/**
 * Clears configuration (logout)
 */
export function clearConfig() {
    saveConfig({});
}
/**
 * Checks if user is logged in
 */
export function isLoggedIn() {
    const config = loadConfig();
    return !!config.currentUser;
}
/**
 * Gets current user
 */
export function getCurrentUser() {
    const config = loadConfig();
    return config.currentUser || null;
}
/**
 * Sets current user
 */
export function setCurrentUser(username, userId) {
    const config = loadConfig();
    config.currentUser = { username, userId };
    config.lastLogin = new Date().toISOString();
    saveConfig(config);
}
