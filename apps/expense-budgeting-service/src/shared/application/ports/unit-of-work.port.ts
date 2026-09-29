/**
 * Canonical Unit of Work application port.
 * Provides transactional boundary abstraction across modules.
 */
export interface IUnitOfWork {
  execute<T>(work: () => Promise<T>): Promise<T>;
}
