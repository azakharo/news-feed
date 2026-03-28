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

### 4.5 Page Object Model

Following Playwright best practices, we use **Page Object Model (POM)** to encapsulate UI interactions and make tests more maintainable.

#### Why POM for NewsFeed?

| Criteria | NewsFeed | POM Needed? |
|----------|----------|-------------|
| Interactions per page | 8+ (search, expand, scroll, banner, etc.) | ✅ Yes |
| Test files using feed | 6 spec files | ✅ Yes |
| Code duplication | High without POM | ✅ Yes |

#### Page Object: FeedPage

**File:** `frontend/e2e/page-objects/feed.page.ts`

```typescript
import { type Page, type Locator, expect } from '@playwright/test';

export class FeedPage {
  readonly page: Page;

  // Locators - readonly, assigned in constructor
  readonly searchInput: Locator;
  readonly clearSearchButton: Locator;
  readonly posts: Locator;
  readonly skeletons: Locator;
  readonly loadingIndicator: Locator;
  readonly newItemsBanner: Locator;
  readonly dismissBannerButton: Locator;
  readonly expandButton: Locator;
  readonly collapseButton: Locator;
  readonly errorMessage: Locator;
  readonly emptyState: Locator;
  readonly highlightedText: Locator;

  constructor(page: Page) {
    this.page = page;

    // Semantic locators first (preferred)
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.clearSearchButton = page.getByRole('button', { name: /clear/i });
    this.expandButton = page.getByRole('button', { name: /show more/i });
    this.collapseButton = page.getByRole('button', { name: /show less/i });
    this.dismissBannerButton = page.getByRole('button', { name: /dismiss/i });
    this.errorMessage = page.getByText(/error loading posts/i);
    this.emptyState = page.getByText(/no posts found/i);
    this.highlightedText = page.locator('mark');

    // Data-testid locators (when no semantic role exists)
    this.posts = page.locator('[data-post-id]');
    this.skeletons = page.getByTestId('post-skeleton');
    this.loadingIndicator = page.getByTestId('loading-indicator');
    this.newItemsBanner = page.getByTestId('new-items-banner');
  }

  // === Navigation ===

  async goto() {
    await this.page.goto('/');
  }

  // === Wait Methods ===

  async waitForFeedReady() {
    await expect(this.posts.first()).toBeVisible();
  }

  async waitForLoadComplete() {
    await expect(this.loadingIndicator).toBeHidden();
  }

  // === Search Actions ===

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounce (500ms) and API response
    await this.page.waitForResponse(resp =>
      resp.url().includes('/api/posts') && resp.status() === 200,
      { timeout: 5000 }
    ).catch(() => {}); // Ignore if no request made
  }

  async clearSearch() {
    await this.clearSearchButton.click();
  }

  // === Expand/Collapse Actions ===

  async expandFirstPost() {
    await this.expandButton.first().click();
  }

  async collapseFirstPost() {
    await this.collapseButton.first().click();
  }

  async expandPostByIndex(index: number) {
    await this.expandButton.nth(index).click();
  }

  // === Scroll Actions ===

  async scrollToBottom() {
    await this.page.mouse.wheel(0, 5000);
  }

  async scrollToPosition(y: number) {
    await this.page.mouse.wheel(0, y);
  }

  async getScrollPosition(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  // === Banner Actions ===

  async isBannerVisible(): Promise<boolean> {
    return this.newItemsBanner.isVisible().catch(() => false);
  }

  async dismissBanner() {
    if (await this.isBannerVisible()) {
      await this.dismissBannerButton.click();
      await expect(this.newItemsBanner).toBeHidden();
    }
  }

  // === Posts Info ===

  async getPostsCount(): Promise<number> {
    return this.posts.count();
  }

  async getFirstPostId(): Promise<string | null> {
    return this.posts.first().getAttribute('data-post-id');
  }

  // === Assertions ===

  async expectPostsCount(count: number) {
    await expect(this.posts).toHaveCount(count);
  }

  async expectPostsCountGreaterThan(min: number) {
    const count = await this.posts.count();
    expect(count).toBeGreaterThan(min);
  }

  async expectSkeletonsVisible() {
    await expect(this.skeletons.first()).toBeVisible();
  }

  async expectLoadingVisible() {
    await expect(this.loadingIndicator).toBeVisible();
  }

  async expectLoadingHidden() {
    await expect(this.loadingIndicator).toBeHidden();
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectEmptyStateVisible() {
    await expect(this.emptyState).toBeVisible();
  }

  async expectHighlightsVisible() {
    await expect(this.highlightedText.first()).toBeVisible();
  }

  async expectExpandButtonVisible() {
    await expect(this.expandButton.first()).toBeVisible();
  }

  async expectCollapseButtonVisible() {
    await expect(this.collapseButton.first()).toBeVisible();
  }
}
```

### 4.6 Test Fixtures

**File:** `frontend/e2e/fixtures/base.fixture.ts`

```typescript
import { test as base, expect } from '@playwright/test';
import { FeedPage } from '../page-objects/feed.page';

// Constants
export const SEARCH_DEBOUNCE_MS = 500;
export const POLLING_INTERVAL_MS = 30000;

// Define fixture types
type MyFixtures = {
  feedPage: FeedPage;
  readyFeedPage: FeedPage;
};

// Extend base test with custom fixtures
export const test = base.extend<MyFixtures>({
  // Simple POM fixture - creates instance for each test
  feedPage: async ({ page }, use) => {
    const feedPage = new FeedPage(page);
    await use(feedPage);
  },

  // POM fixture with setup - navigates and waits for feed to be ready
  readyFeedPage: async ({ page }, use) => {
    const feedPage = new FeedPage(page);
    await feedPage.goto();
    await feedPage.waitForFeedReady();
    await use(feedPage);
  },
});

export { expect };
```

### 4.7 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Architecture                            │
│                                                                  │
│  Test File (*.spec.ts)                                          │
│       │                                                          │
│       ├── Uses Fixtures (readyFeedPage, feedPage)               │
│       │                                                          │
│       └── Calls Page Object Methods                             │
│                │                                                 │
│                ├── Navigation: goto()                           │
│                ├── Actions: search(), expandFirstPost()         │
│                ├── Waits: waitForFeedReady()                    │
│                └── Assertions: expectPostsCount()               │
│                                                                  │
│  Benefits:                                                       │
│  ✅ Single source of truth for locators                         │
│  ✅ Intent-revealing method names                               │
│  ✅ Easy maintenance - change POM, update all tests             │
│  ✅ Better IDE autocomplete                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Test Cases

All tests use the Page Object Model via fixtures. Import from `./fixtures/base.fixture`.

### 5.1 Virtual Feed Tests

**File:** `frontend/e2e/virtual-feed.spec.ts`

```typescript
import { test, expect } from './fixtures/base.fixture';

test('should show skeletons during initial load', async ({ page, feedPage }) => {
  await feedPage.goto();
  await feedPage.expectSkeletonsVisible();
});

test('should render posts after initial load', async ({ readyFeedPage }) => {
  // First page contains 20 posts
  await readyFeedPage.expectPostsCount(20);
});

test('should load more posts on scroll', async ({ readyFeedPage }) => {
  const initialCount = await readyFeedPage.getPostsCount();

  await readyFeedPage.scrollToBottom();
  await readyFeedPage.expectLoadingVisible();
  await readyFeedPage.expectLoadingHidden();

  // Each page loads 20 posts
  await readyFeedPage.expectPostsCount(initialCount + 20);
});
```

### 5.2 Search Tests

**File:** `frontend/e2e/search.spec.ts`

```typescript
import { test, expect } from './fixtures/base.fixture';

test('should highlight search terms in results', async ({ readyFeedPage }) => {
  await readyFeedPage.search('test');
  await readyFeedPage.expectHighlightsVisible();

  const firstHighlight = await readyFeedPage.highlightedText.first().textContent();
  expect(firstHighlight?.toLowerCase()).toContain('test');
});

test('should show empty state for no results', async ({ readyFeedPage }) => {
  await readyFeedPage.search('zzzzzzzznonexistent999');
  await readyFeedPage.expectEmptyStateVisible();
});

test('should reset feed when search is cleared', async ({ readyFeedPage }) => {
  await readyFeedPage.search('test');
  await expect(readyFeedPage.posts.first()).toBeVisible();
  await readyFeedPage.clearSearch();
  await readyFeedPage.expectPostsCount(20);
});
```

### 5.3 Expand/Collapse Tests

**File:** `frontend/e2e/expand-collapse.spec.ts`

```typescript
import { test, expect } from './fixtures/base.fixture';

test('should expand long content', async ({ readyFeedPage }) => {
  await readyFeedPage.expandFirstPost();
  await readyFeedPage.expectCollapseButtonVisible();
});

test('should collapse expanded content', async ({ readyFeedPage }) => {
  await readyFeedPage.expandFirstPost();
  await readyFeedPage.collapseFirstPost();
  await readyFeedPage.expectExpandButtonVisible();
});

test('should maintain scroll position when expanding', async ({ readyFeedPage }) => {
  await readyFeedPage.scrollToPosition(500);
  const scrollBefore = await readyFeedPage.getScrollPosition();

  await readyFeedPage.expandFirstPost();

  // Retry scroll check to handle dynamic content reflow
  await expect(async () => {
    const scrollAfter = await readyFeedPage.getScrollPosition();
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
  }).toPass({ timeout: 1000 });
});
```

### 5.4 New Items Banner Tests

**File:** `frontend/e2e/new-items-banner.spec.ts`

```typescript
import { test, expect } from './fixtures/base.fixture';

test('should dismiss banner when X button clicked', async ({ readyFeedPage }) => {
  const isVisible = await readyFeedPage.isBannerVisible();

  if (isVisible) {
    await readyFeedPage.dismissBanner();
    await expect(readyFeedPage.newItemsBanner).not.toBeVisible();
  }
  // Pass if banner didn't appear - polling may not have triggered
});
```

> **Note:** Testing new items banner appearance requires backend manipulation. Options:
> 1. Add test-only API endpoint: `POST /api/test/posts` to create test posts
> 2. Use Playwright route mocking to simulate `/posts/new-count` response
> 3. Skip full polling test and test component in isolation

### 5.5 Error Handling Tests

**File:** `frontend/e2e/error-handling.spec.ts`

```typescript
import { test, expect } from './fixtures/base.fixture';

test('should show error when API fails', async ({ page, feedPage }) => {
  // Mock must be set up before navigation
  await page.route('**/api/posts*', route => route.abort('failed'));
  await feedPage.goto();
  await feedPage.expectErrorVisible();
});

test('should show error on network failure', async ({ page, feedPage }) => {
  await page.context().setOffline(true);
  await feedPage.goto();
  await feedPage.expectErrorVisible();
  await page.context().setOffline(false);
});
```

### 5.6 Media Loading Tests

**File:** `frontend/e2e/media.spec.ts`

```typescript
import { test, expect } from './fixtures/base.fixture';

test('should render images with aspect ratio', async ({ readyFeedPage }) => {
  const image = readyFeedPage.page.locator('img[loading="lazy"]').first();

  if (await image.isVisible()) {
    const parent = image.locator('xpath=..');
    const hasAspectRatio = await parent.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.aspectRatio !== 'auto';
    });

    expect(hasAspectRatio).toBe(true);
  }
});

test('should render videos with controls', async ({ readyFeedPage }) => {
  const video = readyFeedPage.page.locator('video[controls]').first();

  if (await video.isVisible()) {
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
│   ├── fixtures/
│   │   └── base.fixture.ts      # Custom fixtures with POM integration
│   ├── page-objects/
│   │   └── feed.page.ts         # FeedPage POM - main page interactions
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

### Phase 2: Create Page Object Model

- [ ] Create `e2e/page-objects/feed.page.ts` with FeedPage class
- [ ] Create `e2e/fixtures/base.fixture.ts` with custom fixtures
- [ ] Define all locators in FeedPage constructor
- [ ] Add action methods (search, expand, scroll, dismiss)
- [ ] Add assertion methods (expectPostsCount, expectErrorVisible, etc.)

### Phase 3: Add Data Test IDs

- [ ] Add `data-testid` to VirtualFeed component
- [ ] Add `data-post-id` to PostCard component
- [ ] Add `data-testid` to PostSkeleton component
- [ ] Add `data-testid` to LoadingIndicator component
- [ ] Add `data-testid` to NewItemsBanner component
- [ ] Add `aria-label` to interactive elements for semantic locators

### Phase 4: Write E2E Tests

- [ ] Create `virtual-feed.spec.ts` - 3 tests (using POM)
- [ ] Create `search.spec.ts` - 3 tests (using POM)
- [ ] Create `expand-collapse.spec.ts` - 3 tests (using POM)
- [ ] Create `new-items-banner.spec.ts` - 1-2 tests (using POM)
- [ ] Create `error-handling.spec.ts` - 2 tests (using POM)
- [ ] Create `media.spec.ts` - 2 tests (using POM)

### Phase 5: CI/CD Integration

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
