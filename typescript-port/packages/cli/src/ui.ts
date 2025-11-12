/**
 * CLI UI Utilities
 *
 * Pretty console output and formatting
 */

import chalk from 'chalk';

/**
 * Success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Warning message
 */
export function warn(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

/**
 * Info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Section header
 */
export function header(title: string): void {
  console.log();
  console.log(chalk.bold.cyan(title));
  console.log(chalk.gray('─'.repeat(title.length)));
}

/**
 * Key-value pair
 */
export function keyValue(key: string, value: string | number): void {
  console.log(`${chalk.gray(key + ':')} ${chalk.white(value)}`);
}

/**
 * List item
 */
export function listItem(text: string, prefix = '•'): void {
  console.log(chalk.gray(prefix), text);
}

/**
 * Table formatting
 */
export function table(headers: string[], rows: string[][]): void {
  // Calculate column widths
  const widths = headers.map((h, i) => {
    const values = [h, ...rows.map((r) => r[i] || '')];
    return Math.max(...values.map((v) => v.length));
  });

  // Print header
  const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  console.log(chalk.bold(headerRow));
  console.log(chalk.gray('─'.repeat(headerRow.length)));

  // Print rows
  rows.forEach((row) => {
    const cells = row.map((cell, i) => cell.padEnd(widths[i])).join('  ');
    console.log(cells);
  });
}

/**
 * Spinner
 */
export function spinner(text: string) {
  // Simple implementation without ora for now
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${chalk.cyan(frames[i])} ${text}`);
    i = (i + 1) % frames.length;
  }, 80);

  return {
    succeed: (message?: string) => {
      clearInterval(interval);
      process.stdout.write('\r\x1b[K'); // Clear line
      success(message || text);
    },
    fail: (message?: string) => {
      clearInterval(interval);
      process.stdout.write('\r\x1b[K'); // Clear line
      error(message || text);
    },
    stop: () => {
      clearInterval(interval);
      process.stdout.write('\r\x1b[K'); // Clear line
    },
  };
}

/**
 * Formats date
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

/**
 * Truncates text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Logo
 */
export function logo(): void {
  console.log(
    chalk.cyan.bold(`
  ╔═╗┌─┐┬  ┬┌─┐┬ ┬┬  ┌┬┐
  ║ ║└─┐└┐┌┘├─┤│ ││   ││
  ╚═╝└─┘ └┘ ┴ ┴└─┘┴─┘─┴┘
  ${chalk.gray('Secure Password Manager')}
`)
  );
}
