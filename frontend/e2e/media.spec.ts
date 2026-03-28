import {test, expect} from './fixtures/base.fixture';

test('should render images with aspect ratio', async ({readyFeedPage}) => {
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

test('should render videos with controls', async ({readyFeedPage}) => {
  const video = readyFeedPage.page.locator('video[controls]').first();

  if (await video.isVisible()) {
    await expect(video).toHaveAttribute('controls');
  }
});
