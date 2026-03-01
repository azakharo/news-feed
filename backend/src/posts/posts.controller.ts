import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { PostsService } from './posts.service';
import { GetPostsDto } from './dto/get-posts.dto';
import { PostResponseDto } from './dto/post-response.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getPosts(
    @Query(new ValidationPipe({ transform: true })) query: GetPostsDto,
  ): Promise<PostResponseDto> {
    return this.postsService.findPosts(query);
  }
}
