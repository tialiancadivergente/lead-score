import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string | null;
}
