import { ApiProperty } from '@nestjs/swagger';

export class ListSeasonItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ nullable: true })
  launch_id!: string | null;
}
