import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetNewCountDto {
  @ApiProperty({
    description: 'Cursor ID to count posts newer than this value',
    example: '10000',
  })
  @IsString()
  @IsNotEmpty()
  sinceCursor!: string;

  @ApiPropertyOptional({
    description:
      'Search term to filter posts by title or content (case-insensitive)',
    example: 'technology',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
