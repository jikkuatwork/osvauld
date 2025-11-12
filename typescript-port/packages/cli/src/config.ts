/**
 * CLI Configuration Management
 *
 * Stores user session data and CLI settings
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

export interface CLIConfig {
  currentUser?: {
    username: string;
    userId: string;
  };
  dbPath?: string;
  lastLogin?: string;
}

const CONFIG_DIR = join(homedir(), '.osvauld');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * Ensures config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Loads CLI configuration
 */
export function loadConfig(): CLIConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const data = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Saves CLI configuration
 */
export function saveConfig(config: CLIConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Gets database path
 */
export function getDbPath(): string {
  const config = loadConfig();
  return config.dbPath || join(CONFIG_DIR, 'osvauld.db');
}

/**
 * Clears configuration (logout)
 */
export function clearConfig(): void {
  saveConfig({});
}

/**
 * Checks if user is logged in
 */
export function isLoggedIn(): boolean {
  const config = loadConfig();
  return !!config.currentUser;
}

/**
 * Gets current user
 */
export function getCurrentUser(): CLIConfig['currentUser'] | null {
  const config = loadConfig();
  return config.currentUser || null;
}

/**
 * Sets current user
 */
export function setCurrentUser(username: string, userId: string): void {
  const config = loadConfig();
  config.currentUser = { username, userId };
  config.lastLogin = new Date().toISOString();
  saveConfig(config);
}
