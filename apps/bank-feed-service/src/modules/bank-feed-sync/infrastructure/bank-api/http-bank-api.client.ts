import { z } from 'zod';
import { BankAPITransaction, IBankAPIClient } from '../../application/services/transaction-sync.service';
import { BankAPIError, BankAPIRateLimitError, InvalidBankTokenError } from '../../domain/errors/bank-feed-sync.errors';
import { MAX_TRANSACTIONS_PER_SYNC } from '../../domain/constants/bank-feed-sync.constants';

const transactionSchema = z.object({
  externalId: z.string().refine((value) => value.trim().length > 0),
  amount: z.union([z.number().finite(), z.string()]).transform(String).pipe(z.string().regex(/^-?\d{1,14}(?:\.\d{1,6})?$/)),
  currency: z.string().regex(/^[A-Z]{3}$/),
  description: z.string().refine((value) => value.trim().length > 0),
  merchantName: z.string().optional(),
  categoryName: z.string().optional(),
  transactionDate: z.string().datetime({ offset: true }),
  postedDate: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const responseSchema = z.object({ transactions: z.array(transactionSchema).max(MAX_TRANSACTIONS_PER_SYNC) });

/** Provider-neutral adapter for a configured transaction endpoint. */
export class HttpBankAPIClient implements IBankAPIClient {
  constructor(
    private readonly endpoint: string | undefined = process.env.BANK_FEED_PROVIDER_URL,
    private readonly request: typeof fetch = fetch
  ) {}

  async fetchTransactions(accessToken: string, fromDate: Date, toDate: Date): Promise<BankAPITransaction[]> {
    if (!this.endpoint) {
      throw new BankAPIError('BANK_FEED_PROVIDER_URL is not configured', 'configured-provider');
    }

    let url: URL;
    try {
      url = new URL(this.endpoint);
    } catch {
      throw new BankAPIError('BANK_FEED_PROVIDER_URL is invalid', 'configured-provider');
    }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      throw new BankAPIError('Bank provider endpoint must use HTTPS', url.hostname);
    }
    url.searchParams.set('fromDate', fromDate.toISOString());
    url.searchParams.set('toDate', toDate.toISOString());

    let response: Response;
    try {
      response = await this.request(url, {
        headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      });
    } catch {
      throw new BankAPIError('Unable to reach bank provider', url.hostname);
    }
    if (response.status === 429) {
      const header = response.headers.get('retry-after');
      const retryAfter = header === null ? undefined : Number(header);
      throw new BankAPIRateLimitError(retryAfter !== undefined && Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined);
    }
    if (response.status === 401 || response.status === 403) {
      throw new InvalidBankTokenError();
    }
    if (!response.ok) {
      throw new BankAPIError(`Provider returned HTTP ${response.status}`, url.hostname);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BankAPIError('Provider returned invalid JSON', url.hostname);
    }
    const parsed = responseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BankAPIError('Provider returned an invalid transaction response', url.hostname);
    }
    return parsed.data.transactions.map((transaction) => ({
      ...transaction,
      amount: transaction.amount.toString(),
      transactionDate: new Date(transaction.transactionDate),
      postedDate: transaction.postedDate ? new Date(transaction.postedDate) : undefined,
    }));
  }
}
