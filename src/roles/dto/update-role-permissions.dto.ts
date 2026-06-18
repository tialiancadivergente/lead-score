import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String] })
  permissionIds!: string[];
}
