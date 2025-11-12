/**
 * Share Commands
 */
import * as ui from '../ui.js';
import { getAuthenticatedApp } from './auth.js';
import { Capability } from '@osvauld/core';
/**
 * Share document command
 */
export function shareCommand(program) {
    program
        .command('share')
        .description('Share a document')
        .argument('<documentId>', 'Document ID')
        .argument('<recipientKey>', 'Recipient public key (base64url)')
        .option('-c, --capabilities <caps>', 'Comma-separated capabilities (read,write,share,delete)', 'read')
        .option('-e, --expires <hours>', 'Expiration in hours', '168') // 7 days default
        .action(async (documentId, recipientKey, options) => {
        const spin = ui.spinner('Creating share link...');
        try {
            const app = getAuthenticatedApp();
            // Parse capabilities
            const capStrings = options.capabilities.split(',').map((c) => c.trim().toLowerCase());
            const capabilities = [];
            for (const cap of capStrings) {
                if (cap === 'read')
                    capabilities.push(Capability.READ);
                else if (cap === 'write')
                    capabilities.push(Capability.WRITE);
                else if (cap === 'share')
                    capabilities.push(Capability.SHARE);
                else if (cap === 'delete')
                    capabilities.push(Capability.DELETE);
                else {
                    spin.stop();
                    ui.error(`Invalid capability: ${cap}`);
                    ui.info('Valid capabilities: read, write, share, delete');
                    process.exit(1);
                }
            }
            const expiresIn = parseInt(options.expires, 10) * 60 * 60 * 1000; // Convert hours to ms
            const { shareId, token } = await app.shareDocument(documentId, recipientKey, capabilities, expiresIn);
            spin.succeed('Share link created');
            ui.header('Share Details');
            ui.keyValue('Share ID', shareId);
            ui.keyValue('Capabilities', capabilities.join(', '));
            ui.keyValue('Expires', `${options.expires} hours from now`);
            console.log();
            ui.info('UCAN Token (send this to recipient):');
            console.log(token);
        }
        catch (err) {
            spin.fail('Failed to create share link');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * List shares command
 */
export function listSharesCommand(program) {
    program
        .command('shares')
        .description('List share links for a document')
        .argument('<documentId>', 'Document ID')
        .action(async (documentId) => {
        try {
            const app = getAuthenticatedApp();
            const shares = await app.getDocumentShares(documentId);
            if (shares.length === 0) {
                ui.info('No shares found');
                return;
            }
            ui.header(`Share Links (${shares.length})`);
            const rows = shares.map((share) => [
                ui.truncate(share.id, 15),
                share.capabilities.join(','),
                ui.formatDate(share.expiresAt),
                ui.formatDate(share.createdAt),
            ]);
            ui.table(['Share ID', 'Capabilities', 'Expires', 'Created'], rows);
        }
        catch (err) {
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Revoke share command
 */
export function revokeShareCommand(program) {
    program
        .command('revoke')
        .description('Revoke a share link')
        .argument('<shareId>', 'Share ID')
        .option('-y, --yes', 'Skip confirmation')
        .action(async (shareId, options) => {
        if (!options.yes) {
            ui.warn('This will revoke access for all recipients using this share link!');
            ui.info('Use --yes to confirm revocation');
            return;
        }
        const spin = ui.spinner('Revoking share link...');
        try {
            const app = getAuthenticatedApp();
            await app.revokeShare(shareId);
            spin.succeed('Share link revoked');
        }
        catch (err) {
            spin.fail('Failed to revoke share link');
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
/**
 * Verify access command
 */
export function verifyAccessCommand(program) {
    program
        .command('verify')
        .description('Verify access to a document')
        .argument('<token>', 'UCAN token')
        .argument('<documentId>', 'Document ID')
        .argument('<capability>', 'Capability to check (read/write/share/delete)')
        .action(async (token, documentId, capabilityStr) => {
        try {
            const app = getAuthenticatedApp();
            let capability;
            if (capabilityStr === 'read')
                capability = Capability.READ;
            else if (capabilityStr === 'write')
                capability = Capability.WRITE;
            else if (capabilityStr === 'share')
                capability = Capability.SHARE;
            else if (capabilityStr === 'delete')
                capability = Capability.DELETE;
            else {
                ui.error(`Invalid capability: ${capabilityStr}`);
                ui.info('Valid capabilities: read, write, share, delete');
                process.exit(1);
            }
            const hasAccess = await app.verifyAccess(token, documentId, capability);
            if (hasAccess) {
                ui.success(`Access granted: ${capabilityStr}`);
            }
            else {
                ui.error(`Access denied: ${capabilityStr}`);
                process.exit(1);
            }
        }
        catch (err) {
            ui.error(err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
        }
    });
}
