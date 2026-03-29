import {test} from './fixtures/base.fixture';

test('should show skeletons during initial load', async ({feedPage}) => {
  await feedPage.goto();
  await feedPage.expectSkeletonsVisible();
});

test('should render posts after initial load', async ({readyFeedPage}) => {
  // Virtual feed only renders visible items in viewport, not all fetched posts
  await readyFeedPage.expectPostsCountGreaterThan(0);
});

test('should load more posts on scroll', async ({readyFeedPage}) => {
  const initialCount = await readyFeedPage.getPostsCount();

  await readyFeedPage.scrollToBottom();
  await readyFeedPage.expectLoadingVisible();
  await readyFeedPage.expectLoadingHidden();

  // Each page loads 20 posts
  await readyFeedPage.expectPostsCount(initialCount + 20);
});
