import {test} from './fixtures/base.fixture';

test('should show skeletons during initial load', async ({feedPage}) => {
  await feedPage.goto();
  await feedPage.expectSkeletonsVisible();
});

test('should render posts after initial load', async ({readyFeedPage}) => {
  // First page contains 20 posts
  await readyFeedPage.expectPostsCount(20);
});

test('should load more posts on scroll', async ({readyFeedPage}) => {
  const initialCount = await readyFeedPage.getPostsCount();

  await readyFeedPage.scrollToBottom();
  await readyFeedPage.expectLoadingVisible();
  await readyFeedPage.expectLoadingHidden();

  // Each page loads 20 posts
  await readyFeedPage.expectPostsCount(initialCount + 20);
});
