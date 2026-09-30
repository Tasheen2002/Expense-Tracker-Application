# Bank Feed Sync API Routes

All routes use the prefix `/api/v1/workspaces`. They require an internal service key, an authenticated gateway actor, and workspace membership. Mutations require ADMIN/OWNER for connections and sync, or MEMBER level for processing transactions.

## Bank Connections

- POST /:workspaceId/bank-feed-sync/connections
- GET /:workspaceId/bank-feed-sync/connections
- GET /:workspaceId/bank-feed-sync/connections/:connectionId
- PUT /:workspaceId/bank-feed-sync/connections/:connectionId/token
- POST /:workspaceId/bank-feed-sync/connections/:connectionId/disconnect
- DELETE /:workspaceId/bank-feed-sync/connections/:connectionId

## Transaction Sync

- POST /:workspaceId/bank-feed-sync/connections/:connectionId/sync
- GET /:workspaceId/bank-feed-sync/connections/:connectionId/sync/history
- GET /:workspaceId/bank-feed-sync/sync/:sessionId
- GET /:workspaceId/bank-feed-sync/sync/active

## Bank Transactions

- GET /:workspaceId/bank-feed-sync/transactions/pending
- GET /:workspaceId/bank-feed-sync/transactions/:transactionId
- PUT /:workspaceId/bank-feed-sync/transactions/:transactionId/process
- GET /:workspaceId/bank-feed-sync/transactions/connection/:connectionId

Sync runs synchronously and returns HTTP 200 with `data.sessionId` after completion. Date inputs use ISO 8601 timestamps with a timezone. `forceSync: true` is unsupported; cooldown is always enforced. Lists default to limit 50 and offset 0, with a maximum limit of 100.
