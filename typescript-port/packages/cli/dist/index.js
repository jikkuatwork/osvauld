#!/usr/bin/env node
/**
 * Osvauld CLI
 *
 * Command-line interface for Osvauld password manager
 */
import { Command } from 'commander';
import * as ui from './ui.js';
import { registerCommand, loginCommand, logoutCommand, whoamiCommand } from './commands/auth.js';
import { createCommand, listCommand, getCommand, updateCommand, deleteCommand, favoriteCommand, tagCommand, } from './commands/documents.js';
import { createFolderCommand, listFoldersCommand, moveFolderCommand, deleteFolderCommand, } from './commands/folders.js';
import { searchCommand, suggestCommand } from './commands/search.js';
import { shareCommand, listSharesCommand, revokeShareCommand, verifyAccessCommand, } from './commands/share.js';
import { statsCommand } from './commands/stats.js';
const program = new Command();
// Program metadata
program
    .name('osvauld')
    .description('Osvauld - Secure, decentralized password manager')
    .version('0.1.0')
    .hook('preAction', (thisCommand) => {
    // Show logo on main command
    if (thisCommand.args.length === 0) {
        ui.logo();
    }
});
// Authentication commands
registerCommand(program);
loginCommand(program);
logoutCommand(program);
whoamiCommand(program);
// Document commands
createCommand(program);
listCommand(program);
getCommand(program);
updateCommand(program);
deleteCommand(program);
favoriteCommand(program);
tagCommand(program);
// Folder commands
createFolderCommand(program);
listFoldersCommand(program);
moveFolderCommand(program);
deleteFolderCommand(program);
// Search commands
searchCommand(program);
suggestCommand(program);
// Share commands
shareCommand(program);
listSharesCommand(program);
revokeShareCommand(program);
verifyAccessCommand(program);
// Stats command
statsCommand(program);
// Parse arguments
program.parse();
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
