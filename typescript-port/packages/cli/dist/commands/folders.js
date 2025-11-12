/**
 * Folder Commands
 */
import * as ui from '../ui.js';
import { getAuthenticatedApp } from './auth.js';
/**
 * Create folder command
 */
export function createFolderCommand(program) {
    program
        .command('folder')
        .description('Create a new folder')
        .argument('<name>', 'Folder name')
        .option('-p, --parent <parentId>', 'Parent folder ID')
        .action(async (name, options) => {
        const spin = ui.spinner('Creating folder...');
        try {
            const app = getAuthenticatedApp();
            const folder = await app.createFolder(name, options.parent);
            spin.succeed('Folder created');
            ui.info(`Folder ID: ${folder.id}`);
            ui.info(`Name: ${folder.name}`);
        }
        catch (err) {
            spin.fail('Failed to create folder');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * List folders command
 */
export function listFoldersCommand(program) {
    program
        .command('folders')
        .description('List folder tree')
        .action(async () => {
        try {
            const app = getAuthenticatedApp();
            const folders = await app.getFolderTree();
            if (folders.length === 0) {
                ui.info('No folders found');
                return;
            }
            ui.header('Folder Tree');
            printFolderTree(folders, 0);
        }
        catch (err) {
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Print folder tree recursively
 */
function printFolderTree(folders, depth) {
    folders.forEach((folder, index) => {
        const isLast = index === folders.length - 1;
        const prefix = '  '.repeat(depth) + (isLast ? '└─ ' : '├─ ');
        console.log(prefix + folder.name + ui.truncate(` (${folder.id})`, 15));
        if (folder.children && folder.children.length > 0) {
            printFolderTree(folder.children, depth + 1);
        }
    });
}
/**
 * Move folder command
 */
export function moveFolderCommand(program) {
    program
        .command('move-folder')
        .description('Move folder to a new parent')
        .argument('<folderId>', 'Folder ID to move')
        .option('-p, --parent <parentId>', 'New parent folder ID (empty for root)')
        .action(async (folderId, options) => {
        const spin = ui.spinner('Moving folder...');
        try {
            const app = getAuthenticatedApp();
            await app.moveFolder(folderId, options.parent);
            spin.succeed('Folder moved');
        }
        catch (err) {
            spin.fail('Failed to move folder');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Delete folder command
 */
export function deleteFolderCommand(program) {
    program
        .command('delete-folder')
        .description('Delete a folder')
        .argument('<folderId>', 'Folder ID')
        .option('-y, --yes', 'Skip confirmation')
        .action(async (folderId, options) => {
        if (!options.yes) {
            ui.warn('This action cannot be undone!');
            ui.info('Use --yes to confirm deletion');
            return;
        }
        const spin = ui.spinner('Deleting folder...');
        try {
            const app = getAuthenticatedApp();
            await app.deleteFolder(folderId);
            spin.succeed('Folder deleted');
        }
        catch (err) {
            spin.fail('Failed to delete folder');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
