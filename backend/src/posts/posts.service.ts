import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { PostEntity } from '../entities/post.entity';
import { GetPostsDto } from './dto/get-posts.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { GetNewCountDto } from './dto/get-new-count.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
  ) {}

  async findPosts(query: GetPostsDto): Promise<PostResponseDto> {
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

    return {
      items,
      nextCursor,
      hasMore,
    };
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
}
