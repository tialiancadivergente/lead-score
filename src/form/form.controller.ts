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
import { CreateFormDto } from './dto/create-form.dto';
import { FormResponseDto } from './dto/form-response.dto';
import { ListFormQueryDto } from './dto/list-form-query.dto';
import { ListFormItemDto } from './dto/list-form-response.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormService } from './form.service';

@ApiTags('Form')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('forms', 'view')
@Controller('form')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista forms',
    description:
      'Retorna todos os registros da tabela form. Permite filtros por launch_id, season_id e type.',
  })
  @ApiQuery({
    name: 'launch_id',
    required: false,
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  @ApiQuery({
    name: 'season_id',
    required: false,
    example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    example: 'quiz',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de forms retornada com sucesso.',
    type: ListFormItemDto,
    isArray: true,
  })
  @ApiResponse({
    status: 400,
    description: 'Filtro invalido.',
  })
  async listAll(@Query() query: ListFormQueryDto): Promise<ListFormItemDto[]> {
    return await this.formService.listAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca form por id',
    description: 'Retorna os dados de um form especifico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Form encontrado com sucesso.',
    type: FormResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido. Informe um UUID valido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form nao encontrado.',
  })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<FormResponseDto> {
    return await this.formService.findById(id);
  }

  @Post()
  @RequirePermission('forms', 'create')
  @ApiOperation({
    summary: 'Cadastra form',
    description: 'Cria um novo form com name, type, launch_id e season_id.',
  })
  @ApiBody({ type: CreateFormDto })
  @ApiResponse({
    status: 201,
    description: 'Form criado com sucesso.',
    type: FormResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payload invalido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Launch ou season nao encontrado para os IDs informados.',
  })
  async create(@Body() dto: CreateFormDto): Promise<FormResponseDto> {
    return await this.formService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('forms', 'update')
  @ApiOperation({
    summary: 'Edita form',
    description: 'Atualiza os campos de um form existente.',
  })
  @ApiBody({ type: UpdateFormDto })
  @ApiResponse({
    status: 200,
    description: 'Form atualizado com sucesso.',
    type: FormResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido ou payload invalido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form, launch ou season nao encontrado.',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateFormDto,
  ): Promise<FormResponseDto> {
    return await this.formService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('forms', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove form',
    description: 'Remove o registro da tabela form pelo id.',
  })
  @ApiResponse({
    status: 204,
    description: 'Form removido com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalido. Informe um UUID valido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Form nao encontrado.',
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.formService.remove(id);
  }
}
