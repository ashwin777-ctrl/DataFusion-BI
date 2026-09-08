# Testing Guide — DataFusion BI

This guide describes how to run automated tests, verify multi-tenant database isolation, perform accessibility audits, and debug test failures across DataFusion BI.

---

## 1. Prerequisites & Starting the Services

### Start the PostgreSQL Database

DataFusion BI requires PostgreSQL 16 with Row-Level Security (RLS) support.

```bash
# Option A: Local standalone PostgreSQL cluster (embedded pgsql binary)
npm run db:start

# Option B: Docker Compose
npm run db:up

# Check database status
npm run db:status
```

### Start the Application Server

```bash
# Development Mode (with hot-module replacement on port 3001)
npm run dev

# Production Mode (compiled optimized bundles)
npm run build
npm start
```

Health check verification:
```bash
curl http://localhost:3001/api/health
# Response: {"status":"ok","checks":{"app":"ok","database":"ok"}}
```

---

## 2. Running Playwright End-to-End Tests

The test suite runs against `http://localhost:3001`. Playwright will reuse an existing server if already running, or automatically launch the server defined in `playwright.config.ts`.

### Run All Tests (Headless Default)

```bash
npx playwright test
# Or using npm script:
npm run test:e2e
```

### Run Tests in Headed Mode (Watch Browser Interactions)

```bash
npx playwright test --headed
```

### Run Interactive Playwright UI Mode

```bash
npm run test:e2e:ui
# Or:
npx playwright test --ui
```

### Run Specific Test Suites

```bash
# Run only authentication tests
npx playwright test tests/auth/auth.spec.ts

# Run only dashboard & 3D visualizer tests
npx playwright test tests/dashboard/dashboard.spec.ts

# Run only data ingestion & upload tests
npx playwright test tests/data-sources/sources.spec.ts

# Run only reports & export tests (CSV, XLSX, PDF)
npx playwright test tests/reports/export.spec.ts

# Run only responsive viewport checks
npx playwright test tests/responsive/viewport.spec.ts

# Run only accessibility tests
npx playwright test tests/accessibility/a11y.spec.ts
```

### Run a Single Test by Title Match

```bash
npx playwright test -g "PDF with standard %PDF- header"
```

---

## 3. Viewing Test Traces and Debugging

Playwright retains traces on test failures in `test-results/`.

```bash
# View the trace of a specific test run
npx playwright show-trace test-results/<test-folder>/trace.zip

# Run tests in debug mode (step-by-step inspector)
npx playwright test --debug
```

---

## 4. Multi-Tenant Database & RLS Testing

To verify PostgreSQL Row-Level Security (RLS) enforcement and tenant isolation across all 18 org-scoped tables:

```bash
npm run db:verify-rls
```

This verifies:
- Connection is forced as non-superuser (`bi_app`)
- `rolbypassrls` is disabled
- Organization A cannot read, insert, update, or delete Organization B rows
- Empty or missing organization session context returns 0 rows (fail-closed)

---

## 5. Typecheck & Code Quality Linting

```bash
# Verify zero TypeScript compilation errors
npm run typecheck

# Verify ESLint compliance
npm run lint
```

---

## 6. Resetting & Seeding Test Data

To reset the database and seed fresh baseline accounts and sample fixtures:

```bash
# Reset database schema and run Drizzle migrations
npm run db:bootstrap

# Set default administrator password (ashwin@datafusion.io)
node scripts/set-admin-pw.mjs

# Seed sample enterprise fixtures (Orders, Targets, Customers, Products)
npm run seed:fixtures
```

Default Test Account Credentials:
- **Email:** `ashwin@datafusion.io`
- **Password:** `Admin@123456`
- **Organization:** `DataFusion BI`
