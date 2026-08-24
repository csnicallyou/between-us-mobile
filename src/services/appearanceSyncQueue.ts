let pendingWrite: Promise<void> = Promise.resolve();

/**
 * Preserves the order in which appearance changes were made. Image uploads can
 * take much longer than color changes; without a queue an older upload may reach
 * the server last and overwrite the user's newer selection.
 */
export function enqueueAppearanceWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = pendingWrite.catch(() => undefined).then(operation);
  const settled = result.then(() => undefined, () => undefined);
  pendingWrite = settled;
  return result;
}
