/**
 * Async test helpers
 */

/**
 * Wait for a condition to be true
 *
 * @param condition Function that returns true when condition is met
 * @param timeout Maximum time to wait in ms
 * @param interval Check interval in ms
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a value to change
 */
export async function waitForValueChange<T>(
  getValue: () => T,
  expectedValue: T,
  timeout = 5000
): Promise<void> {
  await waitFor(() => getValue() === expectedValue, timeout);
}
