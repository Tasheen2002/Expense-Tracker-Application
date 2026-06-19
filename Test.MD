Both approaches are used, but in modern software development **most tests are automated and written as test suites**, while QA tools are used for additional testing.

For your DDD + CQRS expense tracker, I would recommend:

## 1. Unit Tests → Automated Code Tests

Written by developers.

Tools:

* Jest
* Vitest
* Mocha

Example:

```ts
describe("CreateExpenseCommandHandler", () => {
  it("should create expense", async () => {
    ...
  });
});
```

These are not usually created with QA tools.

---

## 2. Integration Tests → Automated Code Tests

Written by developers.

Tools:

* Jest/Vitest
* Testcontainers
* Prisma Test DB

Example:

```text
Handler
  ↓
Repository
  ↓
Postgres
```

Again, usually coded manually.

---

## 3. API Testing

You have two options.

### Option A: Automated Test Suites (Recommended)

```ts
request(app)
  .post("/expenses")
  .send(payload)
```

Tools:

* Supertest
* Fastify Inject

These run automatically in CI/CD.

---

### Option B: QA Tools

Tools:

* Postman
* Insomnia
* Bruno

Example:

```text
POST /expenses
```

with saved test assertions.

Good for:

* Exploratory testing
* Quick validation
* Sharing API collections

---

## 4. System / End-to-End Testing

Can be done using QA automation tools.

Tools:

* Playwright
* Cypress
* Selenium

Example:

```text
Login
 ↓
Create Workspace
 ↓
Create Expense
 ↓
View Dashboard
```

Playwright can automate the browser and verify everything works.

---

## What Professional Teams Usually Do

### Developers

Create:

```text
Unit Tests
Integration Tests
API Tests
```

using code.

### QA Engineers

Create:

```text
E2E Tests
Regression Tests
Performance Tests
Exploratory Tests
```

using QA tools.

---

## For Your Project

Since this is an academic/research/internship-level project, a strong testing strategy would be:

```text
Vitest/Jest
├── Unit Tests
├── Integration Tests
└── API Tests

Playwright
└── End-to-End Tests

Postman
└── API Collection
```

This combination demonstrates that:

* Business logic is tested.
* Database integration is tested.
* Endpoints are tested.
* Real user workflows are tested.

That is much stronger than only having a Postman collection or only manually testing endpoints.
