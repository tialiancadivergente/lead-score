import { ApiProperty } from '@nestjs/swagger';

export class ListFormItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  type!: string | null;

  @ApiProperty({ nullable: true })
  launch_id!: string | null;

  @ApiProperty({ nullable: true })
  season_id!: string | null;
}
