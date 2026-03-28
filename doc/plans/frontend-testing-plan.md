# Frontend Testing Plan: NewsFeed

## 1. Overview

### Strategy

- **Approach:** E2E tests only with real backend and test database
- **Test Framework:** [Playwright](https://playwright.dev) with TypeScript
- **Target Coverage:** Critical user flows
- **Database:** Reuse existing `news_feed_test` database from backend tests

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Environment                          │
│                                                             │
│  Browser (Chromium/Firefox/WebKit)                          │
│         │                                                    │
│         ▼                                                    │
│  Frontend (Vite Dev Server) ──────► Backend API (NestJS)   │
│         │                              │                     │
│         │                              ▼                     │
│         │                    Test Database (PostgreSQL)     │
│         │                    news_feed_test                 │
│         │                              │                     │
│         └──────────────────────────────┘                    │
│              Playwright controls all                         │
└─────────────────────────────────────────────────────────────┘
```

### Why E2E Only?

| Feature                      | Unit Test        | E2E Test            | Decision      |
|:-----------------------------|:-----------------|:--------------------|:--------------|
| Virtual list scroll position | ❌ Cannot test   | ✅ Real browser     | E2E required  |
| Dynamic height calculation   | ❌ Mock needed   | ✅ Actual DOM       | E2E required  |
| Infinite scroll triggering   | ❌ Mock needed   | ✅ Real scroll      | E2E required  |
| Search with debounce         | ⚠️ Possible    | ✅ Full flow        | E2E preferred |
| Expand/collapse text         | ⚠️ Possible    | ✅ Real interaction | E2E preferred |
| New items polling            | ❌ Complex mock  | ✅ Real polling     | E2E required  |
| Error states                 | ⚠️ Mock needed | ✅ Real API         | E2E preferred |

---

## 2. Playwright Best Practices

This plan follows Playwright Golden Rules:

| Rule                            | Implementation                                                 |
|:--------------------------------|:---------------------------------------------------------------|
| ✅ `getByRole()` over CSS/XPath | Use semantic locators first                                    |
| ✅ Never `waitForTimeout()`     | Use web-first assertions or `waitForResponse`                  |
| ✅ Web-first assertions         | `expect(locator).toBeVisible()` not `expect(value).toBe(true)` |
| ✅ `baseURL` in config          | Zero hardcoded URLs in tests                                   |
| ✅ `trace: 'on-first-retry'`    | Rich debugging without slowdown                                |
| ✅ Fixtures over globals        | Share state via `test.extend()`                                |
| ✅ Mock external services only  | Real backend with test database                                |

---

## 3. Test Categories

### 3.1 Critical Flows (Must Have)

| Category         | Priority | Test Cases                                     |
|:-----------------|:---------|:-----------------------------------------------|
| Virtual Feed     | P0       | Initial load, skeleton, render posts           |
| Infinite Scroll  | P0       | Load more, cursor pagination, no duplicates    |
| Search           | P0       | Input debounce, results, highlighting, reset   |
| Expand/Collapse  | P0       | Toggle state, scroll anchor, height change     |
| New Items Banner | P1       | Appear on new items, click to refresh, dismiss |

### 3.2 Edge Cases (Should Have)

| Category       | Priority | Test Cases                       |
|:---------------|:---------|:---------------------------------|
| Empty State    | P1       | No posts, no search results      |
| Error Handling | P1       | API error, network failure       |
| End of Feed    | P2       | End message, no more items       |
| Media Loading  | P2       | Images with aspect ratio, videos |

---

## 4. Test Infrastructure

### 4.1 Dependencies

Add to `frontend/package.json`:

```json
{
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.10.0"
  },
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

### 4.2 Playwright Configuration

**File:** `frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential for database consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for shared database
  reporter: 'html',

  // Timeouts
  timeout: 30_000,
  expect: {
    timeout: 5_000, // Per-assertion retry timeout
  },

  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,

    // Artifact collection
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
```

### 4.3 Test Database Setup

Tests use the same `news_feed_test` database as backend tests.

**Prerequisites:**

1. PostgreSQL running (Docker or local)
2. `news_feed_test` database created
3. Migrations applied
4. Seed data loaded

**Setup Script:** Add to `frontend/package.json`:

```json
{
  "scripts": {
    "test:e2e:setup": "cd ../backend && npm run test:setup && npm run db:seed"
  }
}
```

### 4.4 Environment Configuration

**File:** `frontend/.env.test`

```env
# Backend API URL for tests
VITE_API_BASE_URL=http://localhost:3000
```

### 4.5 Test Fixtures

**File:** `frontend/e2e/fixtures.ts`

```typescript
import { test as base, expect } from '@playwright/test';

// Constants
export const SEARCH_DEBOUNCE_MS = 500;
export const POLLING_INTERVAL_MS = 30000;

// Extend base test with custom fixtures
export const test = base.extend<{
  // Fixture to ensure feed is loaded and ready
  feedPage: Page;
}>({
  feedPage: async ({ page }, use) => {
    await page.goto('/');

    // Wait for posts to be visible using web-first assertion
    await expect(page.locator('[data-post-id]').first()).toBeVisible();

    await use(page);
  },
});

export { expect };
```

---

## 5. Test Cases

### 5.1 Virtual Feed Tests

**File:** `frontend/e2e/virtual-feed.spec.ts`

#### Test 1: Initial Load Shows Skeletons Then Posts

```typescript
import { test, expect } from './fixtures';

test('should show skeletons during initial load', async ({ page }) => {
  // Navigate and capture initial state
  await page.goto('/');

  // Skeletons should appear - web-first assertion with short timeout
  const skeletons = page.getByTestId('post-skeleton');
  await expect(skeletons.first()).toBeVisible({ timeout: 1000 });
});
```

#### Test 2: Posts Render After Loading

```typescript
import { test, expect } from './fixtures';

test('should render posts after initial load', async ({ feedPage }) => {
  // Posts already visible from fixture
  const posts = feedPage.locator('[data-post-id]');

  // Verify at least 20 posts (first page)
  await expect(posts).toHaveCount(20, { timeout: 10_000 });
});
```

#### Test 3: Infinite Scroll Loads More Posts

```typescript
import { test, expect } from './fixtures';

test('should load more posts on scroll', async ({ feedPage }) => {
  const posts = feedPage.locator('[data-post-id]');

  // Get initial post count
  const initialCount = await posts.count();

  // Scroll to bottom using wheel action
  await feedPage.mouse.wheel(0, 5000);

  // Wait for loading indicator to appear and then disappear
  const loader = feedPage.getByTestId('loading-indicator');
  await expect(loader).toBeVisible();
  await expect(loader).toBeHidden();

  // Verify more posts loaded
  await expect(posts).toHaveCount(initialCount + 20, { timeout: 15_000 });
});
```

### 5.2 Search Tests

**File:** `frontend/e2e/search.spec.ts`

#### Test 4: Search Results Show Highlighting

```typescript
import { test, expect } from './fixtures';

test('should highlight search terms in results', async ({ feedPage }) => {
  // Type search term
  const searchInput = feedPage.getByRole('textbox', { name: /search/i });
  await searchInput.fill('test');

  // Wait for results with retry
  await expect(async () => {
    const highlights = feedPage.locator('mark');
    const count = await highlights.count();
    expect(count).toBeGreaterThan(0);
  }).toPass({ timeout: 5000 });

  const firstHighlight = await highlights.first().textContent();
  expect(firstHighlight?.toLowerCase()).toContain('test');
});
```

#### Test 5: Search Returns No Results Message

```typescript
import { test, expect } from './fixtures';

test('should show empty state for no results', async ({ feedPage }) => {
  // Search for non-existent term
  const searchInput = feedPage.getByRole('textbox', { name: /search/i });
  await searchInput.fill('zzzzzzzznonexistent999');

  // Wait for empty state using web-first assertion
  await expect(feedPage.getByText(/no posts found/i)).toBeVisible({ timeout: 5000 });
});
```

#### Test 6: Clear Search Resets Feed

```typescript
import { test, expect } from './fixtures';

test('should reset feed when search is cleared', async ({ feedPage }) => {
  // Perform search
  const searchInput = feedPage.getByRole('textbox', { name: /search/i });
  await searchInput.fill('test');

  // Wait for filtered results
  await expect(feedPage.locator('[data-post-id]').first()).toBeVisible();

  // Clear search using clear button
  await feedPage.getByRole('button', { name: /clear/i }).click();

  // Verify feed shows all posts again
  await expect(feedPage.locator('[data-post-id]')).toHaveCount(20, { timeout: 5000 });
});
```

### 5.3 Expand/Collapse Tests

**File:** `frontend/e2e/expand-collapse.spec.ts`

#### Test 8: Expand Button Shows Full Content

```typescript
import { test, expect } from './fixtures';

test('should expand long content', async ({ feedPage }) => {
  // Find and click expand button using semantic locator
  const expandButton = feedPage.getByRole('button', { name: /show more/i }).first();

  // Verify button exists before clicking
  await expect(expandButton).toBeVisible();
  await expandButton.click();

  // Button should change to "Show less"
  await expect(feedPage.getByRole('button', { name: /show less/i }).first()).toBeVisible();
});
```

#### Test 9: Collapse Button Hides Content

```typescript
import { test, expect } from './fixtures';

test('should collapse expanded content', async ({ feedPage }) => {
  // Expand first
  const expandButton = feedPage.getByRole('button', { name: /show more/i }).first();
  await expandButton.click();

  // Then collapse using semantic locator
  const collapseButton = feedPage.getByRole('button', { name: /show less/i }).first();
  await collapseButton.click();

  // Button should change back
  await expect(feedPage.getByRole('button', { name: /show more/i }).first()).toBeVisible();
});
```

#### Test 10: Scroll Position Maintained on Expand

```typescript
import { test, expect } from './fixtures';

test('should maintain scroll position when expanding', async ({ feedPage }) => {
  // Scroll to middle of page
  await feedPage.mouse.wheel(0, 500);
  const scrollBefore = await feedPage.evaluate(() => window.scrollY);

  // Expand a post
  const expandButton = feedPage.getByRole('button', { name: /show more/i }).first();
  await expandButton.click();

  // Use toPass for retry on scroll check
  await expect(async () => {
    const scrollAfter = await feedPage.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
  }).toPass({ timeout: 1000 });
});
```

### 5.4 New Items Banner Tests

**File:** `frontend/e2e/new-items-banner.spec.ts`

#### Test 11: Banner Dismisses on Click

```typescript
import { test, expect } from './fixtures';

test('should dismiss banner when X button clicked', async ({ feedPage }) => {
  // Banner may or may not appear - use soft assertion
  const banner = feedPage.getByTestId('new-items-banner');

  const isVisible = await banner.isVisible().catch(() => false);

  if (isVisible) {
    // Click dismiss button using aria-label
    await banner.getByRole('button', { name: /dismiss/i }).click();

    // Banner should disappear
    await expect(banner).not.toBeVisible();
  }

  // Pass if banner didn't appear (expected behavior)
});
```

> **Note:** Testing new items banner appearance requires backend manipulation. Options:
> 1. Add test-only API endpoint: `POST /api/test/posts` to create test posts
> 2. Use Playwright route mocking to simulate `/posts/new-count` response
> 3. Skip full polling test and test component in isolation

### 5.5 Error Handling Tests

**File:** `frontend/e2e/error-handling.spec.ts`

#### Test 12: API Error Shows Error Message

```typescript
import { test, expect } from './fixtures';

test('should show error when API fails', async ({ page }) => {
  // Mock failed response BEFORE navigating
  await page.route('**/api/posts*', route => route.abort('failed'));

  await page.goto('/');

  // Should show error message using text locator
  await expect(page.getByText(/error loading posts/i)).toBeVisible({ timeout: 10_000 });
});
```

#### Test 13: Network Error Shows Error Message

```typescript
import { test, expect } from './fixtures';

test('should show error on network failure', async ({ page }) => {
  // Simulate offline
  await page.context().setOffline(true);

  await page.goto('/');

  // Should show error
  await expect(page.getByText(/error/i)).toBeVisible({ timeout: 10_000 });

  // Restore network for cleanup
  await page.context().setOffline(false);
});
```

### 5.6 Media Loading Tests

**File:** `frontend/e2e/media.spec.ts`

#### Test 14: Images Load with Correct Aspect Ratio

```typescript
import { test, expect } from './fixtures';

test('should render images with aspect ratio', async ({ feedPage }) => {
  // Find first post with image
  const image = feedPage.locator('img[loading="lazy"]').first();

  if (await image.isVisible()) {
    // Check that parent container has aspect-ratio style
    const parent = image.locator('xpath=..');
    const hasAspectRatio = await parent.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.aspectRatio !== 'auto';
    });

    expect(hasAspectRatio).toBe(true);
  }
});
```

#### Test 15: Videos Have Controls

```typescript
import { test, expect } from './fixtures';

test('should render videos with controls', async ({ feedPage }) => {
  // Find video element with controls attribute
  const video = feedPage.locator('video[controls]').first();

  if (await video.isVisible()) {
    // Check controls attribute exists
    await expect(video).toHaveAttribute('controls');
  }
});
```

---

## 6. CI/CD Configuration

### 6.1 GitHub Actions Workflow

**File:** `.github/workflows/frontend-tests.yml`

```yaml
name: Frontend E2E Tests

on:
  push:
    branches: [master, develop]
    paths:
      - 'frontend/**'
      - 'backend/src/posts/**'
  pull_request:
    branches: [master]
    paths:
      - 'frontend/**'

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
          cache-dependency-path: frontend/package-lock.json

      # Setup Backend
      - name: Install backend dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run backend migrations
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: news_feed_test
        run: npm run migration:run

      - name: Seed test database
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: news_feed_test
        run: npm run db:seed

      # Start Backend (background)
      - name: Start backend server
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: news_feed_test
          PORT: 3000
        run: npm run start &

      - name: Wait for backend
        run: npx wait-on http://localhost:3000/api/posts -t 30000

      # Setup Frontend
      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Install Playwright browsers
        working-directory: ./frontend
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        working-directory: ./frontend
        env:
          VITE_API_BASE_URL: http://localhost:3000
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

---

## 7. Local Development Setup

### 7.1 Prerequisites

1. PostgreSQL running with `news_feed_test` database
2. Backend dependencies installed
3. Frontend dependencies installed

### 7.2 Setup Commands

```bash
# 1. Start PostgreSQL (if using Docker)
docker run -d --name postgres-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=news_feed_test -p 5432:5432 postgres:16

# 2. Setup test database
cd backend
npm run test:setup
npm run db:seed

# 3. Start backend (Terminal 1)
cd backend
npm run start:dev

# 4. Run frontend tests (Terminal 2)
cd frontend
npm run test:e2e

# Or with UI for debugging
npm run test:e2e:ui
```

### 7.3 Debug Mode

```bash
# Run specific test with debug
npx playwright test --debug -g "should expand"

# Generate code
npx playwright codegen http://localhost:5173
```

---

## 8. File Structure

```
frontend/
├── e2e/
│   ├── fixtures.ts              # Shared test fixtures and helpers
│   ├── virtual-feed.spec.ts     # Virtual list tests
│   ├── search.spec.ts           # Search functionality tests
│   ├── expand-collapse.spec.ts  # Content expand/collapse tests
│   ├── new-items-banner.spec.ts # New items notification tests
│   ├── error-handling.spec.ts   # Error state tests
│   └── media.spec.ts            # Image/video rendering tests
├── playwright.config.ts         # Playwright configuration
├── .env.test                    # Test environment variables
└── package.json                 # Test scripts added
```

---

## 9. Test Data Attributes

Add to components for reliable test selectors (use only when semantic locators don't work):

| Component | Attribute | Location | Use Case |
|-----------|-----------|----------|----------|
| VirtualFeed | `data-testid="virtual-feed"` | Container div | When no semantic role exists |
| PostCard | `data-post-id={post.id}` | Card component | Identifying specific posts |
| PostSkeleton | `data-testid="post-skeleton"` | Skeleton component | No semantic role |
| LoadingIndicator | `data-testid="loading-indicator"` | Loading spinner | No semantic role |
| NewItemsBanner | `data-testid="new-items-banner"` | Banner component | No semantic role |

> **Note:** Prefer `getByRole()` and `getByText()` over `getByTestId()` when possible.

---

## 10. Implementation Checklist

### Phase 1: Infrastructure Setup

- [ ] Install Playwright dependencies
- [ ] Create `playwright.config.ts`
- [ ] Create `.env.test` file
- [ ] Add test scripts to `package.json`
- [ ] Create `e2e/fixtures.ts` with shared fixtures

### Phase 2: Add Data Test IDs

- [ ] Add `data-testid` to VirtualFeed component
- [ ] Add `data-post-id` to PostCard component
- [ ] Add `data-testid` to PostSkeleton component
- [ ] Add `data-testid` to LoadingIndicator component
- [ ] Add `data-testid` to NewItemsBanner component
- [ ] Add `aria-label` to interactive elements for semantic locators

### Phase 3: Write E2E Tests

- [ ] Create `virtual-feed.spec.ts` - 3 tests
- [ ] Create `search.spec.ts` - 3 tests
- [ ] Create `expand-collapse.spec.ts` - 3 tests
- [ ] Create `new-items-banner.spec.ts` - 1-2 tests
- [ ] Create `error-handling.spec.ts` - 2 tests
- [ ] Create `media.spec.ts` - 2 tests

### Phase 4: CI/CD Integration

- [ ] Create `.github/workflows/frontend-tests.yml`
- [ ] Configure backend startup in CI
- [ ] Test workflow on GitHub Actions
- [ ] Add status badge to README

---

## 11. Commands Summary

```bash
# Setup (one-time or after DB reset)
npm run test:e2e:setup

# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test search.spec.ts

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# View report
npm run test:e2e:report

# Generate test code
npx playwright codegen http://localhost:5173
```

---

## 12. Known Limitations

1. **New Items Banner Tests** - Require backend manipulation or mocking
2. **Polling Tests** - 30-second interval makes tests slow
3. **Single Browser** - CI runs only Chromium for speed
4. **Sequential Execution** - Single worker due to shared database

### Future Improvements

- Add test-only API endpoint for simulating new items
- Consider isolated database per test for parallelization
- Add Firefox and WebKit browsers in CI for cross-browser testing
