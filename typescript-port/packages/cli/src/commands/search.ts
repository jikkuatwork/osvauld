/**
 * Search Commands
 */

import { Command } from 'commander';
import * as ui from '../ui.js';
import { getAuthenticatedApp } from './auth.js';

/**
 * Search command
 */
export function searchCommand(program: Command): void {
  program
    .command('search')
    .description('Search documents')
    .argument('<query>', 'Search query')
    .option('-f, --fuzzy', 'Use fuzzy search')
    .action(async (query: string, options: { fuzzy?: boolean }) => {
      try {
        const app = getAuthenticatedApp();
        const results = app.search(query, { fuzzy: options.fuzzy });

        if (results.length === 0) {
          ui.info('No documents found');
          return;
        }

        ui.header(`Search Results (${results.length})`);

        const rows = results.map((result) => [
          ui.truncate(result.id, 12),
          ui.truncate(result.title, 40),
          result.score.toFixed(2),
        ]);

        ui.table(['ID', 'Title', 'Score'], rows);
      } catch (err) {
        ui.error(err instanceof Error ? err.message : 'Unknown error');
        process.exit(1);
      }
    });
}

/**
 * Auto-suggest command
 */
export function suggestCommand(program: Command): void {
  program
    .command('suggest')
    .description('Get document title suggestions')
    .argument('<prefix>', 'Title prefix')
    .option('-l, --limit <number>', 'Max suggestions', '5')
    .action(async (prefix: string, options: { limit: string }) => {
      try {
        const app = getAuthenticatedApp();
        const suggestions = app.autoSuggest(prefix, parseInt(options.limit, 10));

        if (suggestions.length === 0) {
          ui.info('No suggestions found');
          return;
        }

        ui.header('Suggestions');
        suggestions.forEach((suggestion) => {
          ui.listItem(suggestion);
        });
      } catch (err) {
        ui.error(err instanceof Error ? err.message : 'Unknown error');
        process.exit(1);
      }
    });
}
