// ============================================
// Command Interfaces
// ============================================

export interface ICommand {
  readonly commandId?: string;
  readonly timestamp?: Date;
}

export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

// ============================================
// Query Interfaces
// ============================================

export interface IQuery {
  readonly queryId?: string;
  readonly timestamp?: Date;
}

export interface IQueryHandler<TQuery extends IQuery, TResult = any> {
  handle(query: TQuery): Promise<TResult>;
}

// ============================================
// Result Types
// ============================================

export { CommandResult } from './command-result';
export { QueryResult } from './query-result';
