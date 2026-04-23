import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVotingCandidateDto {
  @ApiProperty({ example: '4fdb1be7-ddf1-47fd-8e3c-2caf0a47ddbf' })
  category_id!: string;

  @ApiProperty({ example: 'Fernanda Silva' })
  name!: string;

  @ApiPropertyOptional({
    example:
      'Fernanda vivia o sofrimento de ver o filho com dislexia severa, sem conseguir ler.',
  })
  story_text?: string;

  @ApiProperty({ example: 'https://cdn.site.com/candidates/fernanda.jpg' })
  photo_url!: string;

  @ApiPropertyOptional({ example: 1 })
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}
