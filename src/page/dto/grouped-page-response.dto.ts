import { ApiProperty } from '@nestjs/swagger';
import { ListPageItemDto } from './list-page-response.dto';

export class GroupedPageByLaunchDto {
  @ApiProperty({
    nullable: true,
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  launch_id!: string | null;

  @ApiProperty({ nullable: true, example: 'O Resgate dos Otimistas' })
  launch_name!: string | null;

  @ApiProperty({ example: 5 })
  total_pages!: number;

  @ApiProperty({ type: ListPageItemDto, isArray: true })
  pages!: ListPageItemDto[];
}
