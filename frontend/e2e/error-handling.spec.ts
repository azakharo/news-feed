import {test} from './fixtures/base.fixture';

test('should show error when API fails', async ({page, feedPage}) => {
  // Mock must be set up before navigation
  await page.route('**/posts*', route => route.abort('failed'));
  await feedPage.goto();
  await feedPage.expectErrorVisible();
});
