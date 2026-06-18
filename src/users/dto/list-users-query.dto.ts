import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  page?: string;

  @ApiPropertyOptional({ default: 20 })
  pageSize?: string;

  @ApiPropertyOptional()
  search?: string;

  @ApiPropertyOptional()
  roleId?: string;

  @ApiPropertyOptional()
  isActive?: string;
}
