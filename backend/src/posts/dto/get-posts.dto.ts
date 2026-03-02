import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetPostsDto {
  @ApiPropertyOptional({
    description: 'Number of posts to return (1-100)',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Cursor for pagination (cursorId of the last item from previous page)',
    example: '12345',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description:
      'Search term to filter posts by title or content (case-insensitive)',
    example: 'technology',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
