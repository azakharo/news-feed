import {test as baseTest, expect} from './fixtures/base.fixture';

const test = baseTest;

test('should expand long content', async ({readyFeedPage}) => {
  // Skip if no posts with long text exist
  if (!(await readyFeedPage.hasExpandablePosts())) {
    test.skip(true, 'No posts with long text found in feed');
  }

  const postId = await readyFeedPage.expandFirstExpandablePost();
  expect(postId).not.toBeNull();
  await readyFeedPage.expectCollapseButtonVisible(postId!);
});

test('should collapse expanded content', async ({readyFeedPage}) => {
  // Skip if no posts with long text exist
  if (!(await readyFeedPage.hasExpandablePosts())) {
    test.skip(true, 'No posts with long text found in feed');
  }

  const postId = await readyFeedPage.expandFirstExpandablePost();
  expect(postId).not.toBeNull();

  await readyFeedPage.collapsePost(postId!);
  await readyFeedPage.expectExpandButtonVisible(postId!);
});

test('should maintain scroll position when expanding', async ({
  readyFeedPage,
}) => {
  // Skip if no posts with long text exist
  if (!(await readyFeedPage.hasExpandablePosts())) {
    test.skip(true, 'No posts with long text found in feed');
  }

  await readyFeedPage.scrollToPosition(500);
  const scrollBefore = await readyFeedPage.getScrollPosition();

  await readyFeedPage.expandFirstExpandablePost();

  // Retry scroll check to handle dynamic content reflow
  await expect(async () => {
    const scrollAfter = await readyFeedPage.getScrollPosition();
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
  }).toPass({timeout: 1000});
});
