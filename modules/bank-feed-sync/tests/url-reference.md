# Bank Feed Sync API Routes

All routes require workspace ID in the path.

## Bank Connections

- POST /:workspaceId/bank-feed-sync/connections
- GET /:workspaceId/bank-feed-sync/connections
- GET /:workspaceId/bank-feed-sync/connections/:connectionId
- PUT /:workspaceId/bank-feed-sync/connections/:connectionId/token
- PUT /:workspaceId/bank-feed-sync/connections/:connectionId/disconnect
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
