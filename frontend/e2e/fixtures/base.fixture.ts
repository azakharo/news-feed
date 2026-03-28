/* eslint-disable react-hooks/rules-of-hooks */
import {test as base, expect} from '@playwright/test';
import {FeedPage} from '../page-objects/feed.page';

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
  feedPage: async ({page}, use) => {
    const feedPage = new FeedPage(page);
    await use(feedPage);
  },

  // POM fixture with setup - navigates and waits for feed to be ready
  readyFeedPage: async ({page}, use) => {
    const feedPage = new FeedPage(page);
    await feedPage.goto();
    await feedPage.waitForFeedReady();
    await use(feedPage);
  },
});

export {expect};
