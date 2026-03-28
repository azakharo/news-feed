import {test, expect} from './fixtures/base.fixture';

test('should highlight search terms in results', async ({readyFeedPage}) => {
  await readyFeedPage.search('test');
  await readyFeedPage.expectHighlightsVisible();

  const firstHighlight = await readyFeedPage.highlightedText
    .first()
    .textContent();
  expect(firstHighlight?.toLowerCase()).toContain('test');
});

test('should show empty state for no results', async ({readyFeedPage}) => {
  await readyFeedPage.search('zzzzzzzznonexistent999');
  await readyFeedPage.expectEmptyStateVisible();
});

test('should reset feed when search is cleared', async ({readyFeedPage}) => {
  const initialPostIds = await readyFeedPage.getAllPostIds();

  await readyFeedPage.search('test');
  const searchPostIds = await readyFeedPage.getAllPostIds();
  expect(searchPostIds).not.toEqual(initialPostIds);

  await readyFeedPage.clearSearch();
  const resetPostIds = await readyFeedPage.getAllPostIds();
  expect(resetPostIds).toEqual(initialPostIds);
});
