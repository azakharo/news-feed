import {test} from './fixtures/base.fixture';

test('should show error when API fails', async ({page, feedPage}) => {
  // Mock must be set up before navigation
  await page.route('**/api/posts*', route => route.abort('failed'));
  await feedPage.goto();
  await feedPage.expectErrorVisible();
});

test('should show error on network failure', async ({page, feedPage}) => {
  await page.context().setOffline(true);
  await feedPage.goto();
  await feedPage.expectErrorVisible();
  await page.context().setOffline(false);
});
