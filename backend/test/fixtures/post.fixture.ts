import { PostEntity } from '../../src/entities/post.entity';
import { generateRandomAttachments } from '../../src/common/utils/attachment-generator';

export const createPostFixture = (
  overrides: Partial<PostEntity> = {},
): Partial<PostEntity> => ({
  title: 'Test Post',
  content: 'Test content for post',
  attachments: undefined,
  ...overrides,
});

export const createPostFixtureWithAttachments = (
  overrides: Partial<PostEntity> = {},
): Partial<PostEntity> =>
  createPostFixture({
    attachments: generateRandomAttachments(),
    ...overrides,
  });

export const createManyPosts = (
  count: number,
  startIndex = 0,
): Partial<PostEntity>[] =>
  Array.from({ length: count }, (_, i) =>
    createPostFixture({ title: `Post ${startIndex + i}` }),
  );
