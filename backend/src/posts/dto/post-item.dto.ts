import { ApiProperty } from '@nestjs/swagger';

class AttachmentDto {
  @ApiProperty({
    description: 'Type of attachment',
    enum: ['image', 'video'],
    example: 'image',
  })
  type: 'image' | 'video';

  @ApiProperty({
    description: 'URL of the attachment',
    example: 'https://example.com/image.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Aspect ratio of the attachment (width/height)',
    example: 1.77,
  })
  aspectRatio: number;
}

export class PostItemDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Post title',
    example: 'Breaking News: Major Technology Announcement',
  })
  title: string;

  @ApiProperty({
    description: 'Post content (full text)',
    example:
      'Today, a major technology company announced a breakthrough in artificial intelligence...',
  })
  content: string;

  @ApiProperty({
    description: 'Array of media attachments (images/videos)',
    type: [AttachmentDto],
    required: false,
    example: [
      {
        type: 'image',
        url: 'https://example.com/news-image.jpg',
        aspectRatio: 1.77,
      },
    ],
  })
  attachments?: {
    type: 'image' | 'video';
    url: string;
    aspectRatio: number;
  }[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-03-01T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Cursor ID for pagination (BigInt)',
    example: 12345,
  })
  cursorId: number;
}
