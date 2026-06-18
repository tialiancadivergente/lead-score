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
import { CreatePageDto } from './dto/create-page.dto';
import { GroupedPageByLaunchDto } from './dto/grouped-page-response.dto';
import { ListPageQueryDto } from './dto/list-page-query.dto';
import { ListPageItemDto } from './dto/list-page-response.dto';
import {
  CreatePageHeadlineDto,
  PageHeadlineResponseDto,
  UpdatePageHeadlineDto,
} from './dto/page-headline.dto';
import { PageResponseDto } from './dto/page-response.dto';
import {
  CreatePageTemperatureDto,
  PageTemperatureResponseDto,
  UpdatePageTemperatureDto,
} from './dto/page-temperature.dto';
import {
  CreatePageVersionDto,
  PageVersionResponseDto,
  UpdatePageVersionDto,
} from './dto/page-version.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageService } from './page.service';

@ApiTags('Page')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('pages', 'view')
@Controller('page')
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista pages',
    description:
      'Retorna as pages com filtros por launch, season, form, abbreviation e active.',
  })
  @ApiQuery({ name: 'launch_id', required: false })
  @ApiQuery({ name: 'season_id', required: false })
  @ApiQuery({ name: 'form_id', required: false })
  @ApiQuery({ name: 'abbreviation', required: false, example: 'p1' })
  @ApiQuery({ name: 'active', required: false, example: 'true' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pages retornada com sucesso.',
    type: ListPageItemDto,
    isArray: true,
  })
  async listAll(@Query() query: ListPageQueryDto): Promise<ListPageItemDto[]> {
    return await this.pageService.listAll(query);
  }

  @Get('grouped-by-launch')
  @ApiOperation({
    summary: 'Lista pages agrupadas por launch',
    description:
      'Retorna as pages agrupadas por launch. Use os mesmos filtros de GET /page para limitar o resultado.',
  })
  @ApiQuery({ name: 'launch_id', required: false })
  @ApiQuery({ name: 'season_id', required: false })
  @ApiQuery({ name: 'form_id', required: false })
  @ApiQuery({ name: 'abbreviation', required: false, example: 'p1' })
  @ApiQuery({ name: 'active', required: false, example: 'true' })
  @ApiResponse({
    status: 200,
    description: 'Pages agrupadas por launch retornadas com sucesso.',
    type: GroupedPageByLaunchDto,
    isArray: true,
  })
  async listGroupedByLaunch(
    @Query() query: ListPageQueryDto,
  ): Promise<GroupedPageByLaunchDto[]> {
    return await this.pageService.listGroupedByLaunch(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca page por id',
    description:
      'Retorna uma page com headlines, temperaturas configuradas e versoes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Page encontrada com sucesso.',
    type: PageResponseDto,
  })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PageResponseDto> {
    return await this.pageService.findById(id);
  }

  @Post()
  @RequirePermission('pages', 'create')
  @ApiOperation({
    summary: 'Cadastra page',
    description:
      'Cria uma page. A abbreviation da page e gerada automaticamente como p1, p2, p3...',
  })
  @ApiBody({ type: CreatePageDto })
  @ApiResponse({
    status: 201,
    description: 'Page criada com sucesso.',
    type: PageResponseDto,
  })
  async create(@Body() dto: CreatePageDto): Promise<PageResponseDto> {
    return await this.pageService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('pages', 'update')
  @ApiOperation({
    summary: 'Edita page',
    description:
      'Atualiza os dados principais da page. A abbreviation nao e editavel.',
  })
  @ApiBody({ type: UpdatePageDto })
  @ApiResponse({
    status: 200,
    description: 'Page atualizada com sucesso.',
    type: PageResponseDto,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageResponseDto> {
    return await this.pageService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('pages', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove page',
    description:
      'Remove a page e suas headlines, temperaturas vinculadas e versoes.',
  })
  @ApiResponse({ status: 204, description: 'Page removida com sucesso.' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.pageService.remove(id);
  }

  @Post(':pageId/headline')
  @RequirePermission('pages', 'create')
  @ApiOperation({
    summary: 'Cadastra headline da page',
    description:
      'Cria uma headline para a page. A abbreviation e gerada como h1, h2, h3...',
  })
  @ApiBody({ type: CreatePageHeadlineDto })
  @ApiResponse({
    status: 201,
    description: 'Headline criada com sucesso.',
    type: PageHeadlineResponseDto,
  })
  async createHeadline(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Body() dto: CreatePageHeadlineDto,
  ): Promise<PageHeadlineResponseDto> {
    return await this.pageService.createHeadline(pageId, dto);
  }

  @Patch(':pageId/headline/:headlineId')
  @RequirePermission('pages', 'update')
  @ApiOperation({ summary: 'Edita headline da page' })
  @ApiBody({ type: UpdatePageHeadlineDto })
  @ApiResponse({
    status: 200,
    description: 'Headline atualizada com sucesso.',
    type: PageHeadlineResponseDto,
  })
  async updateHeadline(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Param('headlineId', new ParseUUIDPipe({ version: '4' }))
    headlineId: string,
    @Body() dto: UpdatePageHeadlineDto,
  ): Promise<PageHeadlineResponseDto> {
    return await this.pageService.updateHeadline(pageId, headlineId, dto);
  }

  @Delete(':pageId/headline/:headlineId')
  @RequirePermission('pages', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove headline da page' })
  async removeHeadline(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Param('headlineId', new ParseUUIDPipe({ version: '4' }))
    headlineId: string,
  ): Promise<void> {
    await this.pageService.removeHeadline(pageId, headlineId);
  }

  @Post(':pageId/temperature')
  @RequirePermission('pages', 'create')
  @ApiOperation({
    summary: 'Cadastra temperatura da page',
    description:
      'Vincula uma temperature a page com tag_id e redirect_url especificos.',
  })
  @ApiBody({ type: CreatePageTemperatureDto })
  @ApiResponse({
    status: 201,
    description: 'Temperatura vinculada com sucesso.',
    type: PageTemperatureResponseDto,
  })
  async createTemperature(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Body() dto: CreatePageTemperatureDto,
  ): Promise<PageTemperatureResponseDto> {
    return await this.pageService.createTemperature(pageId, dto);
  }

  @Patch(':pageId/temperature/:pageTemperatureId')
  @RequirePermission('pages', 'update')
  @ApiOperation({ summary: 'Edita temperatura da page' })
  @ApiBody({ type: UpdatePageTemperatureDto })
  @ApiResponse({
    status: 200,
    description: 'Temperatura da page atualizada com sucesso.',
    type: PageTemperatureResponseDto,
  })
  async updateTemperature(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Param('pageTemperatureId', new ParseUUIDPipe({ version: '4' }))
    pageTemperatureId: string,
    @Body() dto: UpdatePageTemperatureDto,
  ): Promise<PageTemperatureResponseDto> {
    return await this.pageService.updateTemperature(
      pageId,
      pageTemperatureId,
      dto,
    );
  }

  @Delete(':pageId/temperature/:pageTemperatureId')
  @RequirePermission('pages', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove temperatura da page' })
  async removeTemperature(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Param('pageTemperatureId', new ParseUUIDPipe({ version: '4' }))
    pageTemperatureId: string,
  ): Promise<void> {
    await this.pageService.removeTemperature(pageId, pageTemperatureId);
  }

  @Post(':pageId/version')
  @RequirePermission('pages', 'create')
  @ApiOperation({
    summary: 'Cadastra versao da page',
    description:
      'Cria uma versao da page. A abbreviation e gerada como v1, v2, v3...',
  })
  @ApiBody({ type: CreatePageVersionDto })
  @ApiResponse({
    status: 201,
    description: 'Versao criada com sucesso.',
    type: PageVersionResponseDto,
  })
  async createVersion(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Body() dto: CreatePageVersionDto,
  ): Promise<PageVersionResponseDto> {
    return await this.pageService.createVersion(pageId, dto);
  }

  @Patch(':pageId/version/:versionId')
  @RequirePermission('pages', 'update')
  @ApiOperation({ summary: 'Edita versao da page' })
  @ApiBody({ type: UpdatePageVersionDto })
  @ApiResponse({
    status: 200,
    description: 'Versao atualizada com sucesso.',
    type: PageVersionResponseDto,
  })
  async updateVersion(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() dto: UpdatePageVersionDto,
  ): Promise<PageVersionResponseDto> {
    return await this.pageService.updateVersion(pageId, versionId, dto);
  }

  @Delete(':pageId/version/:versionId')
  @RequirePermission('pages', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove versao da page' })
  async removeVersion(
    @Param('pageId', new ParseUUIDPipe({ version: '4' })) pageId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<void> {
    await this.pageService.removeVersion(pageId, versionId);
  }
}
