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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CreateLaunchDto } from './dto/create-launch.dto';
import { LaunchResponseDto } from './dto/launch-response.dto';
import { ListLaunchItemDto } from './dto/list-launch-response.dto';
import { UpdateLaunchDto } from './dto/update-launch.dto';
import { LaunchService } from './launch.service';

@ApiTags('Launch')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('launch', 'view')
@Controller('launch')
export class LaunchController {
  constructor(private readonly launchService: LaunchService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista launches',
    description: 'Retorna todos os registros da tabela launch.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de launches retornada com sucesso.',
    type: ListLaunchItemDto,
    isArray: true,
  })
  async listAll(): Promise<ListLaunchItemDto[]> {
    return await this.launchService.listAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca launch por id',
    description: 'Retorna os dados de um launch especifico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Launch encontrado com sucesso.',
    type: LaunchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido. Informe um UUID valido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Launch nao encontrado.',
  })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<LaunchResponseDto> {
    return await this.launchService.findById(id);
  }

  @Post()
  @RequirePermission('launch', 'create')
  @ApiOperation({
    summary: 'Cadastra launch',
    description: 'Cria um novo registro em launch com name e active.',
  })
  @ApiBody({ type: CreateLaunchDto })
  @ApiResponse({
    status: 201,
    description: 'Launch criado com sucesso.',
    type: LaunchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payload invalido.',
  })
  async create(@Body() dto: CreateLaunchDto): Promise<LaunchResponseDto> {
    return await this.launchService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('launch', 'update')
  @ApiOperation({
    summary: 'Edita launch',
    description: 'Atualiza name e/ou active de um launch existente.',
  })
  @ApiBody({ type: UpdateLaunchDto })
  @ApiResponse({
    status: 200,
    description: 'Launch atualizado com sucesso.',
    type: LaunchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido ou payload invalido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Launch nao encontrado.',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateLaunchDto,
  ): Promise<LaunchResponseDto> {
    return await this.launchService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('launch', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove launch',
    description: 'Remove o registro da tabela launch pelo id.',
  })
  @ApiResponse({
    status: 204,
    description: 'Launch removido com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido. Informe um UUID valido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Launch nao encontrado.',
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.launchService.remove(id);
  }
}
