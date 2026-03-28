import { ApiProperty } from '@nestjs/swagger';

export class NewCountResponseDto {
  @ApiProperty({
    description: 'Number of new posts since the cursor',
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: 'Latest cursor ID in the result set (null if no posts)',
    example: '12345',
    nullable: true,
  })
  latestCursor: string | null;
}
