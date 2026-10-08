# Application contracts

HTTP authentication and workspace/role authorization are authoritative in the routes. Commands and queries are trusted internal APIs: callers must establish workspace access before invoking them. Receipt mutation and file-download methods additionally enforce ownership. Thumbnail mutation now requires an actor too. Workers/internal consumers must establish equivalent authorization rather than passing untrusted IDs directly to these handlers.

Verification and rejection retain the existing policy: the HTTP caller must be an administrator and the receipt owner. This repair does not expand access to other members' receipts. If administrator review across owners is required later, introduce an explicit reviewer policy/context and attribute audit events to the actual reviewer.

`processReceipt` records OCR text/confidence supplied by the caller; it does not perform OCR extraction. It validates first, transitions in memory, then commits the result and both events in one repository transaction. Failed persistence leaves no earlier committed PROCESSING write. Retry requires reloading the aggregate.

Receipt creation uses INSERT. Existing receipt writes compare an integer revision and increment it atomically. Conflicts return HTTP 409 and retain pending events on the rejected aggregate. Reload and reconsider the operation; do not blindly retry a stale aggregate. A failed update cannot recreate a permanently deleted receipt.

Metadata updates validate all accepted fields in one operation. Unique metadata/tag conflicts are translated at persistence boundaries. Metadata and tag-assignment writes lock the active parent receipt inside their transaction so deletion cannot invalidate an earlier existence check before the write.

Read queries do not write. Lists accept limit 1–100 and offset 0–2147483647, defaulting to 50/0. Expense-linked listing supports the same pagination. Receipt statistics count all six statuses, including REJECTED; soft-deleted records are excluded by the repository.
