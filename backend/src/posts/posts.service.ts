import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PostEntity } from '../entities/post.entity';
import { GetPostsDto } from './dto/get-posts.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { GetNewCountDto } from './dto/get-new-count.dto';

const CACHE_TTL = 300000; // 5 минут

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private generateCacheKey(
    prefix: string,
    params: Record<string, any>,
  ): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  async findPosts(query: GetPostsDto): Promise<PostResponseDto> {
    const cacheKey = this.generateCacheKey('posts:list', query);

    // Check cache first (cache-aside pattern)
    const cachedResult = await this.cacheManager.get<PostResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Cache miss - query database
    const { limit = 20, cursor, search } = query;
    const qb = this.postRepository.createQueryBuilder('post');

    // Cursor-based pagination
    if (cursor) {
      const cursorId = parseInt(cursor, 10);
      if (!isNaN(cursorId)) {
        qb.where('post.cursorId < :cursorId', { cursorId });
      }
    }

    // Search filtering via ILIKE on title and content
    if (search) {
      const searchPattern = `%${search}%`;
      const searchBrackets = new Brackets((qb2) => {
        qb2
          .where('post.title ILIKE :search', { search: searchPattern })
          .orWhere('post.content ILIKE :search', { search: searchPattern });
      });

      if (cursor) {
        qb.andWhere(searchBrackets);
      } else {
        qb.where(searchBrackets);
      }
    }

    // Order by cursorId DESC and limit
    qb.orderBy('post.cursorId', 'DESC').take(limit + 1);

    const results = await qb.getMany();

    // Check if there are more results
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    // Get next cursor from the last item
    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1].cursorId.toString()
        : null;

    const response: PostResponseDto = {
      items,
      nextCursor,
      hasMore,
    };

    // Save to cache
    await this.cacheManager.set(cacheKey, response, CACHE_TTL);

    return response;
  }

  async getNewCount(
    query: GetNewCountDto,
  ): Promise<{ count: number; latestCursor: string | null }> {
    const { sinceCursor, search } = query;
    const sinceCursorId = parseInt(sinceCursor, 10);

    if (isNaN(sinceCursorId)) {
      return { count: 0, latestCursor: null };
    }

    const qb = this.postRepository.createQueryBuilder('post');

    // Count posts with cursorId greater than sinceCursor
    qb.where('post.cursorId > :sinceCursorId', { sinceCursorId });

    // Search filtering via ILIKE on title and content (same logic as findPosts)
    if (search) {
      const searchPattern = `%${search}%`;
      qb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('post.title ILIKE :search', { search: searchPattern })
            .orWhere('post.content ILIKE :search', { search: searchPattern });
        }),
      );
    }

    // Get count and max cursorId
    const result = await qb
      .select('COUNT(*)', 'count')
      .addSelect('MAX(post.cursorId)', 'latestCursor')
      .getRawOne<{ count: string; latestCursor: string | null }>();

    return {
      count: parseInt(result?.count || '0', 10),
      latestCursor: result?.latestCursor || null,
    };
  }

  async invalidatePostsCache(): Promise<void> {
    // Для простоты очищаем весь кэш posts
    // В продакшене использовать паттерн с версионированием
    await this.cacheManager.del('posts:list');
  }
}
