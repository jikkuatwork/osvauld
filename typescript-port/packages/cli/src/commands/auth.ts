/**
 * Authentication Commands
 */

import { Osvauld } from '@osvauld/core';
import { Command } from 'commander';
import * as ui from '../ui.js';
import { setCurrentUser, clearConfig, isLoggedIn, getCurrentUser } from '../config.js';

let osvauld: Osvauld;

function getOsvauld(): Osvauld {
  if (!osvauld) {
    osvauld = new Osvauld();
  }
  return osvauld;
}

/**
 * Register command
 */
export function registerCommand(program: Command): void {
  program
    .command('register')
    .description('Register a new user')
    .argument('<username>', 'Username')
    .argument('<password>', 'Password')
    .option('-e, --email <email>', 'Email address')
    .action(async (username: string, password: string, options: { email?: string }) => {
      const spin = ui.spinner('Registering user...');

      try {
        const app = getOsvauld();
        const user = await app.register(username, password, { email: options.email });

        setCurrentUser(username, user.id);

        spin.succeed(`User '${username}' registered successfully`);
        ui.info(`User ID: ${user.id}`);
        if (user.email) {
          ui.info(`Email: ${user.email}`);
        }
      } catch (err) {
        spin.fail('Registration failed');
        ui.error(err instanceof Error ? err.message : 'Unknown error');
        process.exit(1);
      }
    });
}

/**
 * Login command
 */
export function loginCommand(program: Command): void {
  program
    .command('login')
    .description('Login to Osvauld')
    .argument('<username>', 'Username')
    .argument('<password>', 'Password')
    .action(async (username: string, password: string) => {
      const spin = ui.spinner('Logging in...');

      try {
        const app = getOsvauld();
        const user = await app.login(username, password);

        setCurrentUser(username, user.id);

        spin.succeed(`Logged in as '${username}'`);
        ui.info(`User ID: ${user.id}`);
      } catch (err) {
        spin.fail('Login failed');
        ui.error(err instanceof Error ? err.message : 'Unknown error');
        process.exit(1);
      }
    });
}

/**
 * Logout command
 */
export function logoutCommand(program: Command): void {
  program
    .command('logout')
    .description('Logout from Osvauld')
    .action(() => {
      if (!isLoggedIn()) {
        ui.warn('Not logged in');
        return;
      }

      const user = getCurrentUser();
      clearConfig();
      ui.success(`Logged out from '${user?.username}'`);
    });
}

/**
 * Whoami command
 */
export function whoamiCommand(program: Command): void {
  program
    .command('whoami')
    .description('Show current user')
    .action(() => {
      if (!isLoggedIn()) {
        ui.warn('Not logged in');
        process.exit(1);
      }

      const user = getCurrentUser();
      if (user) {
        ui.header('Current User');
        ui.keyValue('Username', user.username);
        ui.keyValue('User ID', user.userId);
      }
    });
}

/**
 * Requires authentication
 */
export function requireAuth(): void {
  if (!isLoggedIn()) {
    ui.error('Not logged in. Please run: osvauld login <username> <password>');
    process.exit(1);
  }
}

/**
 * Gets authenticated Osvauld instance
 */
export function getAuthenticatedApp(): Osvauld {
  requireAuth();
  return getOsvauld();
}
