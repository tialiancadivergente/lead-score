import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CreateSeasonDto } from './dto/create-season.dto';
import { ListSeasonQueryDto } from './dto/list-season-query.dto';
import { ListSeasonItemDto } from './dto/list-season-response.dto';
import { SeasonResponseDto } from './dto/season-response.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { SeasonService } from './season.service';

@ApiTags('Season')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('season', 'view')
@Controller('season')
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista seasons',
    description:
      'Retorna todos os registros da tabela season. Opcionalmente filtra por launch_id.',
  })
  @ApiQuery({
    name: 'launch_id',
    required: false,
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de seasons retornada com sucesso.',
    type: ListSeasonItemDto,
    isArray: true,
  })
  async listAll(
    @Query() query: ListSeasonQueryDto,
  ): Promise<ListSeasonItemDto[]> {
    return await this.seasonService.listAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca season por id',
    description: 'Retorna os dados de uma season especifica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Season encontrada com sucesso.',
    type: SeasonResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido. Informe um UUID valido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Season nao encontrada.',
  })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<SeasonResponseDto> {
    return await this.seasonService.findById(id);
  }

  @Post()
  @RequirePermission('season', 'create')
  @ApiOperation({
    summary: 'Cadastra season',
    description: 'Cria uma season informando name, active e launch_id.',
  })
  @ApiBody({ type: CreateSeasonDto })
  @ApiResponse({
    status: 201,
    description: 'Season criada com sucesso.',
    type: SeasonResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payload invalido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Launch nao encontrado para o launch_id informado.',
  })
  async create(@Body() dto: CreateSeasonDto): Promise<SeasonResponseDto> {
    return await this.seasonService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('season', 'update')
  @ApiOperation({
    summary: 'Edita season',
    description:
      'Atualiza name, active e/ou launch_id de uma season existente.',
  })
  @ApiBody({ type: UpdateSeasonDto })
  @ApiResponse({
    status: 200,
    description: 'Season atualizada com sucesso.',
    type: SeasonResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido ou payload invalido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Season ou launch nao encontrado.',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSeasonDto,
  ): Promise<SeasonResponseDto> {
    return await this.seasonService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('season', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove season',
    description: 'Remove o registro da tabela season pelo id.',
  })
  @ApiResponse({
    status: 204,
    description: 'Season removida com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido. Informe um UUID valido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Season nao encontrada.',
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.seasonService.remove(id);
  }
}
