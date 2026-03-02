import { ApiProperty } from '@nestjs/swagger';
import { PostItemDto } from './post-item.dto';

export class PostResponseDto {
  @ApiProperty({
    description: 'Array of posts for the current page',
    type: [PostItemDto],
  })
  items: PostItemDto[];

  @ApiProperty({
    description: 'Cursor for the next page (null if no more pages)',
    example: '12345',
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({
    description: 'Indicates if there are more pages available',
    example: true,
  })
  hasMore: boolean;
}
