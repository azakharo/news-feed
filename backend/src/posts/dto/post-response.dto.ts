import { PostEntity } from '../../entities/post.entity';

export class PostResponseDto {
  items: PostEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}
