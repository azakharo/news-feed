import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PostEntity } from '../src/entities/post.entity';
import { PostResponseDto } from '../src/posts/dto/post-response.dto';
import { NewCountResponseDto } from '../src/posts/dto/new-count-response.dto';
import { createPostFixture, createManyPosts } from './fixtures/post.fixture';

describe('Posts API (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let dataSource: DataSource;
  let postsRepository: Repository<PostEntity>;

  const TEST_POSTS_COUNT = 25;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    server = app.getHttpServer() as unknown as Server;
    dataSource = app.get<DataSource>(getDataSourceToken());
    postsRepository = dataSource.getRepository(PostEntity);
  });

  beforeEach(async () => {
    // Clean database with TRUNCATE posts RESTART IDENTITY CASCADE
    await dataSource.query('TRUNCATE posts RESTART IDENTITY CASCADE');

    // Seed baseline data: 25 posts for pagination tests
    const posts = createManyPosts(TEST_POSTS_COUNT);
    await postsRepository.save(posts);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  /**
   * Helper to get the latest cursor from existing posts.
   * Used in new-count tests to track new posts since last viewed.
   */
  async function getLatestCursor(): Promise<number> {
    const response = await request(server).get('/posts');
    const body = response.body as PostResponseDto;
    return body.items[0].cursorId;
  }

  // ========================================
  // GET /api/posts Test Cases (8 tests)
  // ========================================

  describe('GET /api/posts', () => {
    it('#1 First page without cursor - Returns 20 items, hasMore=true', async () => {
      const response = await request(server).get('/posts');

      expect(response.status).toBe(200);
      const body = response.body as PostResponseDto;
      expect(body.items).toHaveLength(20);
      expect(body.hasMore).toBe(true);
      expect(body.nextCursor).toBeDefined();
    });

    it('#2 Pagination with cursor - Returns next 20 items, no duplicates', async () => {
      // Get first page to get cursor
      const firstPageResponse = await request(server).get('/posts');

      expect(firstPageResponse.status).toBe(200);
      const firstPageBody = firstPageResponse.body as PostResponseDto;
      const firstPageItems = firstPageBody.items;
      const cursor = firstPageBody.nextCursor;

      // Get second page using cursor
      const secondPageResponse = await request(server)
        .get('/posts')
        .query({ cursor });

      expect(secondPageResponse.status).toBe(200);
      const secondPageBody = secondPageResponse.body as PostResponseDto;
      expect(secondPageBody.items).toHaveLength(5); // 25 - 20 = 5 remaining
      expect(secondPageBody.hasMore).toBe(false);
      expect(secondPageBody.nextCursor).toBeNull();

      // Verify no duplicates between pages
      const firstPageIds = firstPageItems.map((item) => item.cursorId);
      const secondPageIds = secondPageBody.items.map((item) => item.cursorId);
      const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
      expect(overlap).toHaveLength(0);
    });

    it('#3 Cursor stability after new post - Results stay same when new post added during pagination', async () => {
      // Get first page
      const firstPageResponse = await request(server).get('/posts');

      expect(firstPageResponse.status).toBe(200);
      const firstPageBody = firstPageResponse.body as PostResponseDto;
      const cursor = firstPageBody.nextCursor;

      // Add a new post
      await postsRepository.save(createPostFixture({ title: 'New Post' }));

      // Get second page with the cursor from first request
      const secondPageResponse = await request(server)
        .get('/posts')
        .query({ cursor });

      expect(secondPageResponse.status).toBe(200);
      const secondPageBody = secondPageResponse.body as PostResponseDto;
      // Verify second page still has 5 items (not affected by new post)
      expect(secondPageBody.items).toHaveLength(5);
    });

    it('#4 Search by term - Returns filtered results', async () => {
      // Add posts with specific searchable content
      await postsRepository.save([
        createPostFixture({ title: 'Unique Search Term Alpha' }),
        createPostFixture({ title: 'Unique Search Term Beta' }),
        createPostFixture({ title: 'Another Post' }),
      ]);

      const response = await request(server)
        .get('/posts')
        .query({ search: 'unique search term' });

      expect(response.status).toBe(200);
      const body = response.body as PostResponseDto;
      expect(body.items.length).toBeGreaterThanOrEqual(2);

      // Verify all returned items contain the search term
      const searchResults = body.items;
      const allMatch = searchResults.every(
        (item) =>
          item.title.toLowerCase().includes('unique search term') ||
          item.content.toLowerCase().includes('unique search term'),
      );
      expect(allMatch).toBe(true);
    });

    it('#5 Search with pagination - Cursor works correctly with search', async () => {
      // Add multiple posts with search term
      const searchPosts = Array.from({ length: 25 }, (_, i) =>
        createPostFixture({ title: `Searchable Post ${i}` }),
      );
      await postsRepository.save(searchPosts);

      // First page with search
      const firstPageResponse = await request(server)
        .get('/posts')
        .query({ search: 'searchable' });

      expect(firstPageResponse.status).toBe(200);
      const firstPageBody = firstPageResponse.body as PostResponseDto;
      expect(firstPageBody.items.length).toBe(20);
      expect(firstPageBody.hasMore).toBe(true);

      const cursor = firstPageBody.nextCursor;

      // Second page with search
      const secondPageResponse = await request(server)
        .get('/posts')
        .query({ search: 'searchable', cursor });

      expect(secondPageResponse.status).toBe(200);
      const secondPageBody = secondPageResponse.body as PostResponseDto;
      expect(secondPageBody.items.length).toBe(5);
      expect(secondPageBody.hasMore).toBe(false);

      // Verify no duplicates
      const firstIds = firstPageBody.items.map((item) => item.cursorId);
      const secondIds = secondPageBody.items.map((item) => item.cursorId);
      const overlap = firstIds.filter((id) => secondIds.includes(id));
      expect(overlap).toHaveLength(0);
    });

    it('#6 Empty search results - Returns empty array, hasMore=false', async () => {
      // Search for something that doesn't exist
      const response = await request(server)
        .get('/posts')
        .query({ search: 'nonexistentterm12345' });

      expect(response.status).toBe(200);
      const body = response.body as PostResponseDto;
      expect(body.items).toHaveLength(0);
      expect(body.hasMore).toBe(false);
      expect(body.nextCursor).toBeNull();
    });

    it('#7 Custom limit - ?limit=5 returns exactly 5 items', async () => {
      const response = await request(server).get('/posts').query({ limit: 5 });

      expect(response.status).toBe(200);
      const body = response.body as PostResponseDto;
      expect(body.items).toHaveLength(5);
      expect(body.hasMore).toBe(true);
    });

    it('#8 Response structure - Validates items, nextCursor, hasMore', async () => {
      const response = await request(server).get('/posts');

      expect(response.status).toBe(200);
      const body = response.body as PostResponseDto;

      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('nextCursor');
      expect(body).toHaveProperty('hasMore');

      // Validate items is an array
      expect(Array.isArray(body.items)).toBe(true);

      // Validate first item structure
      if (body.items.length > 0) {
        const firstItem = body.items[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('title');
        expect(firstItem).toHaveProperty('content');
        expect(firstItem).toHaveProperty('createdAt');
        expect(firstItem).toHaveProperty('cursorId');
      }

      // Validate nextCursor can be string or null
      expect(
        typeof body.nextCursor === 'string' || body.nextCursor === null,
      ).toBe(true);

      // Validate hasMore is boolean
      expect(typeof body.hasMore).toBe('boolean');
    });
  });

  // ========================================
  // GET /api/posts/new-count Test Cases (4 tests)
  // ========================================

  describe('GET /api/posts/new-count', () => {
    it('#1 Count with latestCursor - After adding post, calling with latestCursor returns count=1', async () => {
      const currentLatestCursor = await getLatestCursor();

      // Add a new post
      await postsRepository.save(createPostFixture({ title: 'New Post 1' }));

      // Get new count with the previous latest cursor
      const countResponse = await request(server)
        .get('/posts/new-count')
        .query({ sinceCursor: currentLatestCursor.toString() });

      expect(countResponse.status).toBe(200);
      const countBody = countResponse.body as NewCountResponseDto;
      expect(countBody.count).toBe(1);
      expect(countBody.latestCursor).toBeDefined();
    });

    it('#2 Count increment with same cursor - After adding post, calling with same sinceCursor returns count+1', async () => {
      const currentLatestCursor = await getLatestCursor();

      // Add first new post
      await postsRepository.save(createPostFixture({ title: 'New Post A' }));

      // Get count after first new post
      const firstCountResponse = await request(server)
        .get('/posts/new-count')
        .query({ sinceCursor: currentLatestCursor.toString() });

      expect(firstCountResponse.status).toBe(200);
      const firstCountBody = firstCountResponse.body as NewCountResponseDto;
      const firstCount = firstCountBody.count;

      // Add second new post
      await postsRepository.save(createPostFixture({ title: 'New Post B' }));

      // Get count with same cursor - should increment
      const secondCountResponse = await request(server)
        .get('/posts/new-count')
        .query({ sinceCursor: currentLatestCursor.toString() });

      expect(secondCountResponse.status).toBe(200);
      const secondCountBody = secondCountResponse.body as NewCountResponseDto;
      expect(secondCountBody.count).toBe(firstCount + 1);
    });

    it('#3 Count with search - Filters by search term', async () => {
      const currentLatestCursor = await getLatestCursor();

      // Add new posts - some matching search, some not
      await postsRepository.save([
        createPostFixture({ title: 'Searchable Post Alpha' }),
        createPostFixture({ title: 'Searchable Post Beta' }),
        createPostFixture({ title: 'Non-matching Post' }),
      ]);

      // Get count with search filter
      const searchCountResponse = await request(server)
        .get('/posts/new-count')
        .query({
          sinceCursor: currentLatestCursor.toString(),
          search: 'searchable',
        });

      expect(searchCountResponse.status).toBe(200);
      const searchCountBody = searchCountResponse.body as NewCountResponseDto;
      expect(searchCountBody.count).toBe(2);

      // Get count without search filter
      const totalCountResponse = await request(server)
        .get('/posts/new-count')
        .query({ sinceCursor: currentLatestCursor.toString() });

      expect(totalCountResponse.status).toBe(200);
      const totalCountBody = totalCountResponse.body as NewCountResponseDto;
      expect(totalCountBody.count).toBe(3);
    });

    it('#4 Invalid sinceCursor - Returns count: 0', async () => {
      // Try with invalid cursor (non-numeric)
      const response = await request(server)
        .get('/posts/new-count')
        .query({ sinceCursor: 'invalid' });

      expect(response.status).toBe(200);
      const invalidBody = response.body as NewCountResponseDto;
      expect(invalidBody.count).toBe(0);
      expect(invalidBody.latestCursor).toBeNull();
    });
  });
});
