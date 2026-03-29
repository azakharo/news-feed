import {test, expect} from './fixtures/base.fixture';

test('should show skeletons during initial load', async ({feedPage}) => {
  await feedPage.goto();
  await feedPage.expectSkeletonsVisible();
});

test('should render posts after initial load', async ({readyFeedPage}) => {
  // Virtual feed only renders visible items in viewport, not all fetched posts
  await readyFeedPage.expectPostsCountGreaterThan(0);
});

test('should load more posts on scroll', async ({readyFeedPage}) => {
  // Initial load gets first page (20 posts)
  // Note: Virtual feed only renders visible items in viewport
  const initialCount = await readyFeedPage.getPostsCount();

  // Scroll to bottom to trigger loading more posts
  // The auto-fetch triggers when within 10 items from the end
  await readyFeedPage.scrollToBottom();

  // Wait for next page to load
  await readyFeedPage.page.waitForTimeout(2000);

  // Verify more posts were loaded
  const afterScrollCount = await readyFeedPage.getPostsCount();
  expect(afterScrollCount).toBeGreaterThan(initialCount);
});
