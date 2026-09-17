export interface OperationContext {
  actorId?: string;
  correlationId?: string;
}

/** All repositories participating in work must share this transaction. */
export interface IUnitOfWork {
  execute<T>(work: () => Promise<T>, context?: OperationContext): Promise<T>;
}
