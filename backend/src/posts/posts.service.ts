import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { PostEntity } from '../entities/post.entity';
import { GetPostsDto } from './dto/get-posts.dto';
import { PostResponseDto } from './dto/post-response.dto';

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
      if (cursor) {
        qb.andWhere(
          new Brackets((qb2) => {
            qb2
              .where('post.title ILIKE :search', { search: searchPattern })
              .orWhere('post.content ILIKE :search', { search: searchPattern });
          }),
        );
      } else {
        qb.where(
          new Brackets((qb2) => {
            qb2
              .where('post.title ILIKE :search', { search: searchPattern })
              .orWhere('post.content ILIKE :search', { search: searchPattern });
          }),
        );
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
}
