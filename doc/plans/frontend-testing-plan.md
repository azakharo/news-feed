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

| Feature | Unit Test | E2E Test | Decision |
|---------|-----------|----------|----------|
| Virtual list scroll position | ❌ Cannot test | ✅ Real browser | E2E required |
| Dynamic height calculation | ❌ Mock needed | ✅ Actual DOM | E2E required |
| Infinite scroll triggering | ❌ Mock needed | ✅ Real scroll | E2E required |
| Search with debounce | ⚠️ Possible | ✅ Full flow | E2E preferred |
| Expand/collapse text | ⚠️ Possible | ✅ Real interaction | E2E preferred |
| New items polling | ❌ Complex mock | ✅ Real polling | E2E required |
| Error states | ⚠️ Mock needed | ✅ Real API | E2E preferred |

---

## 2. Test Categories

### 2.1 Critical Flows (Must Have)

| Category | Priority | Test Cases |
|----------|----------|------------|
| Virtual Feed | P0 | Initial load, skeleton, render posts |
| Infinite Scroll | P0 | Load more, cursor pagination, no duplicates |
| Search | P0 | Input debounce, results, highlighting, reset |
| Expand/Collapse | P0 | Toggle state, scroll anchor, height change |
| New Items Banner | P1 | Appear on new items, click to refresh, dismiss |

### 2.2 Edge Cases (Should Have)

| Category | Priority | Test Cases |
|----------|----------|------------|
| Empty State | P1 | No posts, no search results |
| Error Handling | P1 | API error, network failure |
| End of Feed | P2 | End message, no more items |
| Media Loading | P2 | Images with aspect ratio, videos |

---

## 3. Test Infrastructure

### 3.1 Dependencies

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

### 3.2 Playwright Configuration

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

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
    timeout: 10000,
  },
});
```

### 3.3 Test Database Setup

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

### 3.4 Environment Configuration

**File:** `frontend/.env.test`

```env
# Backend API URL for tests
VITE_API_BASE_URL=http://localhost:3000
```

### 3.5 Test Fixtures

**File:** `frontend/e2e/fixtures.ts`

```typescript
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Extend base test with custom fixtures
export const test = base.extend<{
  // Helper to wait for feed to be ready
  waitForFeed: () => Promise<void>;
}>({
  waitForFeed: async ({ page }, use) => {
    await use(async () => {
      await page.waitForSelector('[data-testid="virtual-feed"]', { state: 'visible' });
      await page.waitForSelector('[data-post-id]', { state: 'visible' });
    });
  },
});

export { expect };

// Test data constants
export const TEST_POSTS_COUNT = 25; // Match backend seed
export const SEARCH_DEBOUNCE_MS = 500;
export const POLLING_INTERVAL_MS = 30000;
```

---

## 4. Test Cases

### 4.1 Virtual Feed Tests

**File:** `frontend/e2e/virtual-feed.spec.ts`

#### Test 1: Initial Load Shows Skeletons Then Posts

```typescript
test('should show skeletons during initial load', async ({ page }) => {
  // Navigate and wait for network idle
  await page.goto('/', { waitUntil: 'networkidle' });

  // Skeletons should appear briefly
  const skeletons = page.locator('[data-testid="post-skeleton"]');
  await expect(skeletons.first()).toBeVisible({ timeout: 1000 });
});
```

#### Test 2: Posts Render After Loading

```typescript
test('should render posts after initial load', async ({ page }) => {
  await page.goto('/');

  // Wait for posts to appear
  const posts = page.locator('[data-post-id]');
  await expect(posts.first()).toBeVisible();

  // Verify at least 20 posts (first page)
  const count = await posts.count();
  expect(count).toBeGreaterThanOrEqual(20);
});
```

#### Test 3: Infinite Scroll Loads More Posts

```typescript
test('should load more posts on scroll', async ({ page }) => {
  await page.goto('/');

  // Get initial post count
  const posts = page.locator('[data-post-id]');
  const initialCount = await posts.count();

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // Wait for loading indicator
  await page.locator('[data-testid="loading-indicator"]').waitFor({ state: 'visible' });

  // Wait for more posts
  await expect(async () => {
    const newCount = await posts.count();
    expect(newCount).toBeGreaterThan(initialCount);
  }).toPass();
});
```

### 4.2 Search Tests

**File:** `frontend/e2e/search.spec.ts`

#### Test 4: Search Input Debounces

```typescript
test('should debounce search input', async ({ page }) => {
  await page.goto('/');

  // Type quickly
  const searchInput = page.locator('input[type="text"]');
  await searchInput.type('test query', { delay: 50 });

  // Should not immediately show results
  // Wait for debounce (500ms) + network
  await page.waitForTimeout(600);

  // URL or data should reflect search
  await expect(page.locator('[data-post-id]')).toBeVisible();
});
```

#### Test 5: Search Results Show Highlighting

```typescript
test('should highlight search terms in results', async ({ page }) => {
  await page.goto('/');

  // Search for known term
  const searchInput = page.locator('input[type="text"]');
  await searchInput.fill('test');
  await page.waitForTimeout(600);

  // Check for highlighted text
  const highlights = page.locator('mark');
  const count = await highlights.count();
  expect(count).toBeGreaterThan(0);
});
```

#### Test 6: Search Returns No Results Message

```typescript
test('should show empty state for no results', async ({ page }) => {
  await page.goto('/');

  const searchInput = page.locator('input[type="text"]');
  await searchInput.fill('zzzzzzzzzzzzznonexistent');
  await page.waitForTimeout(600);

  // Check for empty state
  await expect(page.locator('text=No posts found')).toBeVisible();
});
```

#### Test 7: Clear Search Resets Feed

```typescript
test('should reset feed when search is cleared', async ({ page }) => {
  await page.goto('/');

  // Perform search
  const searchInput = page.locator('input[type="text"]');
  await searchInput.fill('test');
  await page.waitForTimeout(600);

  // Clear search using X button
  await page.locator('button[aria-label="Clear search"]').click();
  await page.waitForTimeout(600);

  // Feed should show all posts
  const posts = page.locator('[data-post-id]');
  const count = await posts.count();
  expect(count).toBeGreaterThanOrEqual(20);
});
```

### 4.3 Expand/Collapse Tests

**File:** `frontend/e2e/expand-collapse.spec.ts`

#### Test 8: Expand Button Shows Full Content

```typescript
test('should expand long content', async ({ page }) => {
  await page.goto('/');

  // Find a post with expand button
  const expandButton = page.locator('button:has-text("Show more")').first();
  await expandButton.click();

  // Button should change to "Show less"
  await expect(page.locator('button:has-text("Show less")').first()).toBeVisible();
});
```

#### Test 9: Collapse Button Hides Content

```typescript
test('should collapse expanded content', async ({ page }) => {
  await page.goto('/');

  // Expand first
  const expandButton = page.locator('button:has-text("Show more")').first();
  await expandButton.click();

  // Then collapse
  const collapseButton = page.locator('button:has-text("Show less")').first();
  await collapseButton.click();

  // Button should change back
  await expect(page.locator('button:has-text("Show more")').first()).toBeVisible();
});
```

#### Test 10: Scroll Position Maintained on Expand

```typescript
test('should maintain scroll position when expanding', async ({ page }) => {
  await page.goto('/');

  // Scroll to middle of page
  await page.evaluate(() => window.scrollTo(0, 500));
  const scrollBefore = await page.evaluate(() => window.scrollY);

  // Expand a post
  const expandButton = page.locator('button:has-text("Show more")').first();
  await expandButton.click();

  // Wait for re-render
  await page.waitForTimeout(100);

  // Scroll should be approximately the same
  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
});
```

### 4.4 New Items Banner Tests

**File:** `frontend/e2e/new-items-banner.spec.ts`

#### Test 11: Banner Appears When New Items Exist

```typescript
test.skip('should show banner when new posts are available', async ({ page }) => {
  // This test requires backend manipulation
  // Skip for now - needs backend API to add test post
});
```

> **Note:** New items banner tests require backend manipulation or a very long wait time (30s polling). Consider:
> 1. Adding a test-only API endpoint to simulate new items
> 2. Or mocking the `/posts/new-count` response in Playwright

#### Test 12: Banner Dismisses on Click

```typescript
test('should dismiss banner on X button click', async ({ page }) => {
  // Navigate to page
  await page.goto('/');

  // Check if banner exists (may not always appear)
  const banner = page.locator('[data-testid="new-items-banner"]');
  const isVisible = await banner.isVisible().catch(() => false);

  if (isVisible) {
    // Click dismiss button
    await banner.locator('button[aria-label="Dismiss notification"]').click();
    await expect(banner).not.toBeVisible();
  }

  // Pass if banner didn't appear
});
```

### 4.5 Error Handling Tests

**File:** `frontend/e2e/error-handling.spec.ts`

#### Test 13: API Error Shows Error Message

```typescript
test('should show error when API fails', async ({ page }) => {
  // Mock failed response
  await page.route('**/api/posts*', route => route.abort('failed'));

  await page.goto('/');

  // Should show error message
  await expect(page.locator('text=Error loading posts')).toBeVisible();
});
```

#### Test 14: Network Error Shows Error Message

```typescript
test('should show error on network failure', async ({ page }) => {
  // Simulate offline
  await page.context().setOffline(true);

  await page.goto('/');

  // Should show error
  await expect(page.locator('.text-red-700, .text-red-600')).toBeVisible();

  // Restore network
  await page.context().setOffline(false);
});
```

### 4.6 Media Loading Tests

**File:** `frontend/e2e/media.spec.ts`

#### Test 15: Images Load with Correct Aspect Ratio

```typescript
test('should render images with aspect ratio', async ({ page }) => {
  await page.goto('/');

  // Find first post with image
  const image = page.locator('img[loading="lazy"]').first();

  if (await image.isVisible()) {
    // Check that parent has aspect-ratio
    const parent = image.locator('xpath=..');
    const aspectRatio = await parent.evaluate(el =>
      window.getComputedStyle(el).aspectRatio
    );
    expect(aspectRatio).not.toBe('auto');
  }
});
```

#### Test 16: Videos Have Controls

```typescript
test('should render videos with controls', async ({ page }) => {
  await page.goto('/');

  // Find video element
  const video = page.locator('video[controls]').first();

  if (await video.isVisible()) {
    // Check controls attribute
    await expect(video).toHaveAttribute('controls');
  }
});
```

---

## 5. Test Data Requirements

### 5.1 Seed Data Specifications

The existing backend seed should produce:

| Requirement | Value | Purpose |
|-------------|-------|---------|
| Total posts | 25+ | Test pagination (first page 20 + second page) |
| Posts with long content | Some | Test expand/collapse button |
| Posts with attachments | ~40% | Test media rendering |
| Searchable term | "test" in some posts | Test search functionality |
| Unique term | "zzzzzzzz" non-existent | Test empty results |

### 5.2 Test Data Setup Commands

```bash
# From project root
cd backend
npm run test:setup    # Create test DB and run migrations
npm run db:seed       # Load seed data

# Or use frontend convenience script
cd frontend
npm run test:e2e:setup
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
      - 'backend/src/posts/**'  # Run if backend API changes
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

      # Start Backend (in background)
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

Add to components for reliable test selectors:

| Component | Attribute | Location |
|-----------|-----------|----------|
| VirtualFeed | `data-testid="virtual-feed"` | Container div |
| PostCard | `data-post-id={post.id}` | Card component |
| PostSkeleton | `data-testid="post-skeleton"` | Skeleton component |
| LoadingIndicator | `data-testid="loading-indicator"` | Loading spinner |
| NewItemsBanner | `data-testid="new-items-banner"` | Banner component |

---

## 10. Implementation Checklist

### Phase 1: Infrastructure Setup

- [ ] Install Playwright dependencies
- [ ] Create `playwright.config.ts`
- [ ] Create `.env.test` file
- [ ] Add test scripts to `package.json`
- [ ] Create `e2e/fixtures.ts` with shared helpers

### Phase 2: Add Data Test IDs

- [ ] Add `data-testid` to VirtualFeed component
- [ ] Add `data-post-id` to PostCard component
- [ ] Add `data-testid` to PostSkeleton component
- [ ] Add `data-testid` to LoadingIndicator component
- [ ] Add `data-testid` to NewItemsBanner component

### Phase 3: Write E2E Tests

- [ ] Create `virtual-feed.spec.ts` - 3 tests
- [ ] Create `search.spec.ts` - 4 tests
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
