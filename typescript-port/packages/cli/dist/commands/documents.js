/**
 * Document Commands
 */
import * as ui from '../ui.js';
import { getAuthenticatedApp } from './auth.js';
/**
 * Create document command
 */
export function createCommand(program) {
    program
        .command('create')
        .description('Create a new document')
        .argument('<title>', 'Document title')
        .argument('<content>', 'Document content')
        .option('-f, --folder <folderId>', 'Folder ID')
        .option('-t, --tags <tags>', 'Comma-separated tags')
        .action(async (title, content, options) => {
        const spin = ui.spinner('Creating document...');
        try {
            const app = getAuthenticatedApp();
            const doc = await app.createDocument(title, content, {
                folderId: options.folder,
                tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : undefined,
            });
            spin.succeed('Document created');
            ui.info(`Document ID: ${doc.id}`);
            ui.info(`Title: ${doc.title}`);
            if (doc.tags && doc.tags.length > 0) {
                ui.info(`Tags: ${doc.tags.join(', ')}`);
            }
        }
        catch (err) {
            spin.fail('Failed to create document');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * List documents command
 */
export function listCommand(program) {
    program
        .command('list')
        .description('List all documents')
        .option('-f, --favorites', 'Show only favorites')
        .action(async (options) => {
        try {
            const app = getAuthenticatedApp();
            let docs = await app.listDocuments();
            if (options.favorites) {
                docs = docs.filter((d) => d.isFavorite);
            }
            if (docs.length === 0) {
                ui.info('No documents found');
                return;
            }
            ui.header(`Documents (${docs.length})`);
            const rows = docs.map((doc) => [
                ui.truncate(doc.id, 12),
                ui.truncate(doc.title, 30),
                doc.tags?.join(', ') || '-',
                doc.isFavorite ? '★' : '',
                ui.formatDate(doc.updatedAt),
            ]);
            ui.table(['ID', 'Title', 'Tags', 'Fav', 'Updated'], rows);
        }
        catch (err) {
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Get document command
 */
export function getCommand(program) {
    program
        .command('get')
        .description('Get document by ID')
        .argument('<documentId>', 'Document ID')
        .option('--content-only', 'Show only content')
        .action(async (documentId, options) => {
        try {
            const app = getAuthenticatedApp();
            const { document, content } = await app.getDocument(documentId);
            if (options.contentOnly) {
                console.log(content);
                return;
            }
            ui.header(document.title);
            ui.keyValue('ID', document.id);
            ui.keyValue('Created', ui.formatDate(document.createdAt));
            ui.keyValue('Updated', ui.formatDate(document.updatedAt));
            if (document.tags && document.tags.length > 0) {
                ui.keyValue('Tags', document.tags.join(', '));
            }
            ui.keyValue('Favorite', document.isFavorite ? 'Yes' : 'No');
            console.log();
            console.log(content);
        }
        catch (err) {
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Update document command
 */
export function updateCommand(program) {
    program
        .command('update')
        .description('Update document content')
        .argument('<documentId>', 'Document ID')
        .argument('<content>', 'New content')
        .action(async (documentId, content) => {
        const spin = ui.spinner('Updating document...');
        try {
            const app = getAuthenticatedApp();
            await app.updateDocument(documentId, content);
            spin.succeed('Document updated');
        }
        catch (err) {
            spin.fail('Failed to update document');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Delete document command
 */
export function deleteCommand(program) {
    program
        .command('delete')
        .description('Delete a document')
        .argument('<documentId>', 'Document ID')
        .option('-y, --yes', 'Skip confirmation')
        .action(async (documentId, options) => {
        if (!options.yes) {
            ui.warn('This action cannot be undone!');
            ui.info('Use --yes to confirm deletion');
            return;
        }
        const spin = ui.spinner('Deleting document...');
        try {
            const app = getAuthenticatedApp();
            await app.deleteDocument(documentId);
            spin.succeed('Document deleted');
        }
        catch (err) {
            spin.fail('Failed to delete document');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Toggle favorite command
 */
export function favoriteCommand(program) {
    program
        .command('favorite')
        .description('Toggle document favorite status')
        .argument('<documentId>', 'Document ID')
        .action(async (documentId) => {
        try {
            const app = getAuthenticatedApp();
            const doc = await app.toggleFavorite(documentId);
            if (doc.isFavorite) {
                ui.success('Added to favorites');
            }
            else {
                ui.success('Removed from favorites');
            }
        }
        catch (err) {
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Add tags command
 */
export function tagCommand(program) {
    program
        .command('tag')
        .description('Add tags to a document')
        .argument('<documentId>', 'Document ID')
        .argument('<tags>', 'Comma-separated tags')
        .action(async (documentId, tags) => {
        const spin = ui.spinner('Adding tags...');
        try {
            const app = getAuthenticatedApp();
            const tagList = tags.split(',').map((t) => t.trim());
            await app.addTags(documentId, tagList);
            spin.succeed('Tags added');
            ui.info(`Tags: ${tagList.join(', ')}`);
        }
        catch (err) {
            spin.fail('Failed to add tags');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
