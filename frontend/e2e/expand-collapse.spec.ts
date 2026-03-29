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

  const postId = await readyFeedPage.findFirstExpandablePostId();
  expect(postId).not.toBeNull();

  await readyFeedPage.scrollToPosition(500);
  await readyFeedPage.getScrollPosition(); // ensure scroll is applied

  const expandButton = readyFeedPage.getExpandButtonForPost(postId!);

  // Scroll the button into view explicitly (we control the scroll, not Playwright)
  await expandButton.scrollIntoViewIfNeeded();
  const scrollAfterScrollIntoView = await readyFeedPage.getScrollPosition();

  // Click the button - since it's now in viewport, Playwright won't auto-scroll
  await expandButton.click();

  await readyFeedPage.expectCollapseButtonVisible(postId!);

  // The scroll position should be approximately the same as after scrollIntoViewIfNeeded
  await expect(async () => {
    const scrollAfter = await readyFeedPage.getScrollPosition();
    expect(Math.abs(scrollAfter - scrollAfterScrollIntoView)).toBeLessThan(50);
  }).toPass({timeout: 1000});
});
