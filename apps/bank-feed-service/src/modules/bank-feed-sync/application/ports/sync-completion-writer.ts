import { BankConnection } from '../../domain/entities/bank-connection.entity';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
import { SyncSession } from '../../domain/entities/sync-session.entity';

/** Commits imported rows, completion state, and events as one transaction. */
export interface ISyncCompletionWriter {
  commit(input: {
    connection: BankConnection;
    session: SyncSession;
    transactions: readonly BankTransaction[];
    /** Applies domain transitions using the actual number of inserted rows. */
    finalize: (imported: number) => void;
  }): Promise<void>;
}
