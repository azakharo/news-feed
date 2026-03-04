import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { GetPostsDto } from './dto/get-posts.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { GetNewCountDto } from './dto/get-new-count.dto';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get posts with cursor-based pagination',
    description:
      'Retrieve a paginated list of posts using cursor-based pagination. Supports search filtering on title and content fields.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved paginated posts',
    type: PostResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  async getPosts(
    @Query(new ValidationPipe({ transform: true })) query: GetPostsDto,
  ): Promise<PostResponseDto> {
    return this.postsService.findPosts(query);
  }

  @Get('new-count')
  @ApiOperation({
    summary: 'Get count of new posts since a cursor',
    description:
      'Returns the count of posts with cursorId greater than the provided sinceCursor. Optionally filters by search term.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved new posts count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
        latestCursor: { type: 'string', nullable: true, example: '12345' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  async getNewCount(
    @Query(new ValidationPipe({ transform: true })) query: GetNewCountDto,
  ): Promise<{ count: number; latestCursor: string | null }> {
    return this.postsService.getNewCount(query);
  }
}
