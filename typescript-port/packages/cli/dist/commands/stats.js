/**
 * Stats Command
 */
import * as ui from '../ui.js';
import { getAuthenticatedApp } from './auth.js';
/**
 * Stats command
 */
export function statsCommand(program) {
    program
        .command('stats')
        .description('Show statistics')
        .action(async () => {
        try {
            const app = getAuthenticatedApp();
            const stats = await app.getStats();
            ui.header('Osvauld Statistics');
            ui.keyValue('Documents', stats.documents);
            ui.keyValue('Folders', stats.folders);
            ui.keyValue('Share Links', stats.shares);
            ui.keyValue('Search Index - Documents', stats.searchIndex.documentCount);
            ui.keyValue('Search Index - Terms', stats.searchIndex.termCount);
        }
        catch (err) {
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
