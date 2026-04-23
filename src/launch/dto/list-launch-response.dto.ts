import { ApiProperty } from '@nestjs/swagger';

export class ListLaunchItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  active!: boolean;
}
