import {type Page, type Locator, expect} from '@playwright/test';

export class FeedPage {
  readonly page: Page;

  // Locators - readonly, assigned in constructor
  readonly searchInput: Locator;
  readonly clearSearchButton: Locator;
  readonly posts: Locator;
  readonly skeletons: Locator;
  readonly loadingIndicator: Locator;
  readonly newItemsBanner: Locator;
  readonly dismissBannerButton: Locator;
  readonly expandButton: Locator;
  readonly collapseButton: Locator;
  readonly errorMessage: Locator;
  readonly emptyState: Locator;
  readonly highlightedText: Locator;

  constructor(page: Page) {
    this.page = page;

    // Semantic locators first (preferred)
    this.searchInput = page.getByRole('textbox', {name: /search/i});
    this.clearSearchButton = page.getByRole('button', {name: /clear/i});
    this.expandButton = page.getByRole('button', {name: /show more/i});
    this.collapseButton = page.getByRole('button', {name: /show less/i});
    this.dismissBannerButton = page.getByRole('button', {name: /dismiss/i});
    this.errorMessage = page.getByText(/error loading posts/i);
    this.emptyState = page.getByText(/no posts found/i);
    this.highlightedText = page.locator('mark');

    // Data-testid locators (when no semantic role exists)
    this.posts = page.locator('[data-post-id]');
    this.skeletons = page.getByTestId('post-skeleton');
    this.loadingIndicator = page.getByTestId('loading-indicator');
    this.newItemsBanner = page.getByTestId('new-items-banner');
  }

  // === Post-specific Locators ===

  /**
   * Gets a specific post by its ID.
   */
  getPostById(postId: string): Locator {
    // Use page.locator directly instead of chaining through this.posts
    // to avoid the nested selector issue
    return this.page.locator(`[data-post-id="${postId}"]`);
  }

  /**
   * Gets the expand button for a specific post.
   */
  getExpandButtonForPost(postId: string): Locator {
    return this.getPostById(postId).getByRole('button', {name: /show more/i});
  }

  /**
   * Gets the collapse button for a specific post.
   */
  getCollapseButtonForPost(postId: string): Locator {
    return this.getPostById(postId).getByRole('button', {name: /show less/i});
  }

  // === Navigation ===

  async goto() {
    await this.page.goto('/');
  }

  // === Wait Methods ===

  async waitForFeedReady() {
    await expect(this.posts.first()).toBeVisible();
  }

  async waitForLoadComplete() {
    await expect(this.loadingIndicator).toBeHidden();
  }

  // === Search Actions ===

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounce (500ms) and API response
    await this.page
      .waitForResponse(
        resp => resp.url().includes('/posts') && resp.status() === 200,
        {timeout: 5000},
      )
      .catch(() => {}); // Ignore if no request made
  }

  async clearSearch() {
    await this.clearSearchButton.click();
    // Wait for API response after clearing search
    await this.page
      .waitForResponse(
        resp => resp.url().includes('/posts') && resp.status() === 200,
        {timeout: 5000},
      )
      .catch(() => {}); // Ignore if no request made
  }

  // === Expand/Collapse Actions ===

  /**
   * Finds the first post with a visible expand button.
   * @returns post ID if found, null if no expandable posts exist
   */
  async findFirstExpandablePostId(): Promise<string | null> {
    const count = await this.posts.count();
    for (let i = 0; i < count; i++) {
      const post = this.posts.nth(i);
      const expandBtn = post.getByRole('button', {name: /show more/i});
      if (await expandBtn.isVisible()) {
        return post.getAttribute('data-post-id');
      }
    }
    return null;
  }

  /**
   * Expands the first post with long text.
   * @returns post ID if a post was expanded, null if no expandable posts exist
   */
  async expandFirstExpandablePost(): Promise<string | null> {
    const postId = await this.findFirstExpandablePostId();
    if (postId === null) {
      return null;
    }
    await this.expandPost(postId);
    return postId;
  }

  /**
   * Expands a specific post by ID.
   */
  async expandPost(postId: string) {
    await this.getExpandButtonForPost(postId).click();
  }

  /**
   * Collapses a specific post by ID.
   */
  async collapsePost(postId: string) {
    await this.getCollapseButtonForPost(postId).click();
  }

  /**
   * Checks if any expandable posts exist in the feed.
   */
  async hasExpandablePosts(): Promise<boolean> {
    const postId = await this.findFirstExpandablePostId();
    return postId !== null;
  }

  // === Scroll Actions ===

  async scrollToBottom() {
    // Use JavaScript execution instead of mouse.wheel for more reliable scrolling
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  async scrollToPosition(y: number) {
    await this.page.mouse.wheel(0, y);
  }

  async getScrollPosition(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  // === Banner Actions ===

  async isBannerVisible(): Promise<boolean> {
    return this.newItemsBanner.isVisible().catch(() => false);
  }

  async dismissBanner() {
    if (await this.isBannerVisible()) {
      await this.dismissBannerButton.click();
      await expect(this.newItemsBanner).toBeHidden();
    }
  }

  // === Posts Info ===

  async getPostsCount(): Promise<number> {
    return this.posts.count();
  }

  async getFirstPostId(): Promise<string | null> {
    return this.posts.first().getAttribute('data-post-id');
  }

  async getAllPostIds(): Promise<string[]> {
    return this.posts.evaluateAll(elements =>
      elements.map(el => el.getAttribute('data-post-id') || ''),
    );
  }

  // === Assertions ===

  async expectPostsCount(count: number) {
    await expect(this.posts).toHaveCount(count);
  }

  async expectPostsCountGreaterThan(min: number) {
    const count = await this.posts.count();
    expect(count).toBeGreaterThan(min);
  }

  async expectSkeletonsVisible() {
    await expect(this.skeletons.first()).toBeVisible();
  }

  async expectLoadingVisible() {
    await expect(this.loadingIndicator).toBeVisible();
  }

  async expectLoadingHidden() {
    await expect(this.loadingIndicator).toBeHidden();
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectEmptyStateVisible() {
    await expect(this.emptyState).toBeVisible();
  }

  async expectHighlightsVisible() {
    await expect(this.highlightedText.first()).toBeVisible();
  }

  /**
   * Asserts that the expand button for a specific post is visible.
   */
  async expectExpandButtonVisible(postId: string) {
    await expect(this.getExpandButtonForPost(postId)).toBeVisible();
  }

  /**
   * Asserts that the collapse button for a specific post is visible.
   */
  async expectCollapseButtonVisible(postId: string) {
    await expect(this.getCollapseButtonForPost(postId)).toBeVisible();
  }
}
