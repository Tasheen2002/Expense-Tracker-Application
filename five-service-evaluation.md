# Five-service reassessment after fixes — 2026-09-30

This assessment covers Identity Access, Approval Policy, Expense Budgeting, Audit Compliance, and Bank Feed. Scores are engineering judgments, not test coverage percentages or guarantees of correctness. Allow roughly three points of uncertainty. The review combined current source inspection of critical paths, complete service test suites, coverage, TypeScript checks, production builds, fresh PostgreSQL migration deployment, and Prisma schema comparisons. It was not a new line-by-line inspection of every source file.

## Scores and evidence

| Service | Modules | Passing tests | Line coverage | Score |
| --- | ---: | ---: | ---: | ---: |
| Identity Access | 1 | 248 | 79.06% | 90/100 |
| Approval Policy | 2 | 661 | 89.49% | 91/100 |
| Expense Budgeting | 5 | 952 | 89.42% | 90/100 |
| Audit Compliance | 1 | 109 | 71.24% | 90/100 |
| Bank Feed | 1 | 89 | 82.72% | 90/100 |

Total: 2,059 passing tests in 163 files, covering ten modules. Ten permanent regression tests were added for the five confirmed findings. All five TypeScript checks and production builds passed. Coverage scopes differ between services, so the coverage column is supporting evidence, not a directly comparable ranking.

The common scoring rubric is correctness and workflow behavior (30), security and authorization (20), persistence and concurrency (20), architecture and maintainability (15), and verification and operational evidence (15).

| Service | Correctness /30 | Security /20 | Persistence /20 | Maintainability /15 | Verification /15 | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Identity Access | 28 | 18 | 18 | 13 | 13 | 90 |
| Approval Policy | 28 | 18 | 18 | 13 | 14 | 91 |
| Expense Budgeting | 28 | 18 | 18 | 13 | 13 | 90 |
| Audit Compliance | 28 | 18 | 18 | 13 | 13 | 90 |
| Bank Feed | 28 | 18 | 18 | 13 | 13 | 90 |

## Resolved findings

1. **Identity authentication error boundary fixed.** `src/plugins/auth.ts` uses the existing JWT verification boundary for invalid tokens and lets session-backend errors reach the global error handler. Regression tests verify sanitized production responses for 500 and 503 failures and verify that invalid tokens remain 401 without calling the session backend. Existing revoked/missing-session tests also pass.

2. **Audit rate-limit scope and ordering fixed.** POST and DELETE user routes now run authentication before their route-local write limiter. The parent hook was removed, so the event webhook does not inherit the user mutation limit. Production-mode regression tests verify 40 accepted event requests, independent user buckets, enforcement of the 30-request mutation limit, and rejection of unauthenticated requests before limiting. These boundary tests stub persistence; the existing real publisher-to-audit PostgreSQL/HTTP integration test also passes with internal authentication enabled.

3. **Expense database ownership fixed.** The database plugin constructs Prisma per app. A PostgreSQL regression test verifies distinct clients, disconnect ownership, and a successful query on the second client after closing the first app. Bank-to-Expense HTTP integration tests also passed against the updated Expense service.

4. **Identity and Approval explicit test environment values preserved.** Removed dotenv's `override: true`. Each service has a regression test that imports its actual Vitest configuration with an explicitly supplied database URL and verifies that the URL is unchanged. Complete suites ran against isolated databases without configuration wrappers.

5. **Approval migration contract aligned.** Added `20260930010000_align_policy_name_unique_contract`, creating the compound unique index declared by Prisma while retaining the existing case-insensitive expression index. The compound index supports Prisma's generated unique selector; the expression index additionally protects the business rule. Fresh migration deployment and schema comparison are clean. A PostgreSQL regression test verifies compound lookup, exact and case-insensitive duplicate rejection, and reuse of the same name in a different workspace. Apply the new migration through the normal deployment process in existing environments; this review did not migrate developer or production databases.

## Verification details and limits

- Fresh isolated PostgreSQL databases were migrated for all five services, with two additional databases for cross-service/outbox integration tests. Prisma validation and schema comparisons passed for all five, including Approval after its new migration. Coverage runs used a single fork and exited successfully.
- The passing suites include PostgreSQL and HTTP integration coverage. They do not establish correctness under every deployment topology, distributed load, failure sequence, or live banking-provider behavior. This reassessment did not rerun Docker deployment checks for every service.
- Different shared-folder contents are legitimate when service responsibilities differ. Scores were not reduced for harmless layout differences or for choosing ordinary application services instead of placing orchestration directly in handlers.
- Bank Feed has no newly confirmed blocking defect from this reassessment. Its remaining confidence gap includes live provider behavior and broader operational/load verification. That supports a strong score, not a claim of perfection.

These services form a substantial portfolio backend with meaningful domain rules, authorization, transactional persistence, outbox processing, and regression coverage. All five confirmed findings from the preceding reassessment are resolved in code and verified. The average judgment score is 90.2/100; it is not a measure of CV value or a certification of production readiness. Broader operational verification remains a confidence limit, not a newly confirmed code defect.

Application code, test configuration, and an additive migration were changed as described above. Permanent regression tests remain in the services. Temporary verification scripts, logs, and seven review databases were removed afterward.
