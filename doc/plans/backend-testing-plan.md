# Backend Testing Plan: NewsFeed

## 1. Overview

### Strategy

- **Approach:** E2E tests only — testing API endpoints with real database
- **Target Coverage:** Critical API paths
- **Focus:** Pagination and search functionality

### Test Types

**E2E Tests:**
- `GET /posts` - pagination, search - 7 test cases
- `GET /posts/new-count` - 3 test cases

> Note: E2E tests validate full API contracts with real database interactions

---

## 2. Test Infrastructure

### 2.1 Database Configuration

#### Local Development

- Use existing PostgreSQL Docker container
- Create separate test database: `news_feed_test`
- Clean data between tests using `TRUNCATE`

#### CI/CD (GitHub Actions)

- Use `services: postgres` for isolated test environment
- Configure via environment variables

### 2.2 Environment Variables

Create `.env.test` file:

```env
# Test database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=news_feed_test

# Application
PORT=3001
NODE_ENV=test
```

### 2.3 Test Database Setup

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test:db:create": "ts-node -r tsconfig-paths/register scripts/create-test-db.ts",
    "test:db:migrate": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/data-source.ts",
    "test:setup": "npm run test:db:create && npm run test:db:migrate",
    "test:e2e": "jest --config test/jest-e2e.json"
  }
}
```

---

## 3. E2E Tests

### 3.1 Posts API Tests

**File:** `test/posts.e2e-spec.ts`

#### Test Cases for `GET /posts`

| # | Test Case                 | Validation                                 |
|:--|:--------------------------|:-------------------------------------------|
| 1 | First page without cursor | Returns 20 items, hasMore=true             |
| 2 | Pagination with cursor    | Returns next 20 items, no duplicates       |
| 3 | Search by term            | Returns filtered results with highlights   |
| 4 | Search with pagination    | Cursor works correctly with search         |
| 5 | Empty search results      | Returns empty array, hasMore=false         |
| 6 | Custom limit              | `?limit=5` returns exactly 5 items         |
| 7 | Response structure        | Validates `items`, `nextCursor`, `hasMore` |

#### Test Cases for `GET /posts/new-count`

| # | Test Case           | Validation                         |
|:--|:--------------------|:-----------------------------------|
| 1 | Count new posts     | Returns correct count since cursor |
| 2 | Count with search   | Filters by search term             |
| 3 | Invalid sinceCursor | Returns count: 0                   |

### 3.2 Database Seeding for Tests

Create test fixture factory:

```typescript
// test/fixtures/post.fixture.ts
export const createPostFixture = (overrides = {}) => ({
  title: 'Test Post',
  content: 'Test content for post',
  attachments: null,
  ...overrides,
});

export const createManyPosts = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    createPostFixture({ title: `Post ${i}` })
  );
```

### 3.3 Test Lifecycle

```typescript
describe('Posts API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Initialize app with test database
  });

  beforeEach(async () => {
    // Clean and seed database
    await dataSource.query('TRUNCATE posts RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    // Cleanup
    await dataSource.destroy();
    await app.close();
  });

  // Tests...
});
```

---

## 4. CI/CD Configuration

### GitHub Actions Workflow

**File:** `.github/workflows/backend-tests.yml`

```yaml
name: Backend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: news_feed_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run migrations
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: news_feed_test
        run: npm run migration:run

      - name: Run e2e tests
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: news_feed_test
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          directory: ./backend/coverage
          flags: backend
```

---

## 5. File Structure

```
backend/
├── src/
│   └── posts/
│       └── posts.service.ts
├── test/
│   ├── jest-e2e.json
│   ├── app.e2e-spec.ts
│   ├── posts.e2e-spec.ts            # E2E tests
│   └── fixtures/
│       └── post.fixture.ts          # Test data factories
├── .env.test                         # Test environment
└── scripts/
    └── create-test-db.ts            # Test DB setup script
```

---

## 6. Implementation Checklist

### Phase 1: Infrastructure Setup

- [ ] Create `.env.test` file
- [ ] Create test database `news_feed_test`
- [ ] Update `jest` config for e2e tests
- [ ] Create test fixtures factory

### Phase 2: E2E Tests

- [ ] Create `test/posts.e2e-spec.ts`
- [ ] Implement database cleanup in `beforeEach`
- [ ] Write tests for `GET /posts`
- [ ] Write tests for `GET /posts/new-count`

### Phase 3: CI/CD

- [ ] Create `.github/workflows/backend-tests.yml`
- [ ] Test workflow on GitHub Actions
- [ ] Add coverage reporting (optional: Codecov)

---

## 7. Commands Summary

```bash
# Setup test database (one-time)
npm run test:setup

# Run e2e tests
npm run test:e2e
```
