# Shared backend verification

From the repository root:

```sh
node node_modules/vitest/vitest.mjs run --config packages/vitest.config.ts
node node_modules/typescript/bin/tsc --noEmit -p packages/tsconfig.check.json
```

The suite covers runtime middleware, correlation, resilience, aggregate event
ownership and the outbox worker/publisher. It uses local HTTP servers for redirect
and delivery checks; no live email or banking provider is called.

Runtime middleware delegates token verification to the owning service. Only
authentication errors with status 401 are handled locally; backend/configuration
errors propagate to the service's global error handler. Workspace membership
responses must identify both the requested workspace and the authenticated user.
Credential-bearing membership lookups never follow redirects.

Rate limiter counters are scoped to each constructed policy. A policy reused on
multiple endpoints deliberately shares its quota across those endpoints. IP keys
use Fastify's `request.ip` and therefore respect its configured `trustProxy`
policy. Counters remain process-local; replicas require a shared store or ingress
policy if a cluster-wide quota is required. Existing test-environment bypass is
retained; security regression tests explicitly enable development-mode limiting.

Circuit breakers allow one recovery probe and ignore stale completions from
requests started before the circuit opened or was reset. Timeout wrappers bound
waiting; they do not cancel underlying operations. HTTP outbox delivery also uses
the HTTP client's own timeout. Receivers still require durable deduplication:
delivery is at least once, including when delivery succeeds but acknowledgement
storage fails.

`contracts` contains legacy typed `data` envelopes and a budget event contract;
it is not the universal production webhook validator. Runtime outbox messages use
`payload` envelopes validated by service-specific ingress schemas. Do not replace
those ingress schemas blindly with the legacy schemas. This workspace contains
the backend applications and their supporting shared packages.
