import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CaptureService } from './capture.service';
import { CaptureQuizAnswersResponseDto } from './dto/capture-quiz-answers-response.dto';
import { CaptureFilterQueryDto } from './dto/capture-filter-query.dto';
import { ListCaptureQueryDto } from './dto/list-capture-query.dto';
import { CaptureListResponseDto } from './dto/list-capture-response.dto';

@ApiTags('Capture')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard)
@Controller('capture')
export class CaptureController {
  constructor(private readonly captureService: CaptureService) {}

  @Get('export/csv')
  @ApiOperation({
    summary: 'Exporta registros da tabela capture em CSV',
    description:
      'Retorna um arquivo CSV com os mesmos filtros de periodo, launch, temperature e season.',
  })
  @ApiQuery({ name: 'start_date', required: false, example: '2026-02-01' })
  @ApiQuery({ name: 'end_date', required: false, example: '2026-02-29' })
  @ApiQuery({
    name: 'launch_id',
    required: false,
    example: '0b2f5687-2cdf-4d95-81f9-7e97d6f0d6d2',
  })
  @ApiQuery({
    name: 'temperature_id',
    required: false,
    example: '7b489f3a-e045-4b4e-857f-32544057c9ac',
  })
  @ApiQuery({
    name: 'season_id',
    required: false,
    example: 'f70d2c2f-31cb-4d66-8321-a18aa9f19e18',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'Arquivo CSV gerado com sucesso.',
  })
  async exportCsv(@Query() query: CaptureFilterQueryDto, @Res() res: Response) {
    const csv = await this.captureService.exportCapturesCsv(query);
    const filename = this.buildExportFileName('csv');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('export/excel')
  @ApiOperation({
    summary: 'Exporta registros da tabela capture em Excel',
    description:
      'Retorna um arquivo Excel (.xlsx) com os mesmos filtros de periodo, launch, temperature e season.',
  })
  @ApiQuery({ name: 'start_date', required: false, example: '2026-02-01' })
  @ApiQuery({ name: 'end_date', required: false, example: '2026-02-29' })
  @ApiQuery({
    name: 'launch_id',
    required: false,
    example: '0b2f5687-2cdf-4d95-81f9-7e97d6f0d6d2',
  })
  @ApiQuery({
    name: 'temperature_id',
    required: false,
    example: '7b489f3a-e045-4b4e-857f-32544057c9ac',
  })
  @ApiQuery({
    name: 'season_id',
    required: false,
    example: 'f70d2c2f-31cb-4d66-8321-a18aa9f19e18',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiResponse({
    status: 200,
    description: 'Arquivo Excel gerado com sucesso.',
  })
  async exportExcel(
    @Query() query: CaptureFilterQueryDto,
    @Res() res: Response,
  ) {
    const excelFile = await this.captureService.exportCapturesExcel(query);
    const filename = this.buildExportFileName('xlsx');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelFile);
  }

  @Get(':id/quiz-answers')
  @ApiOperation({
    summary: 'Retorna as respostas do quiz para uma capture',
    description:
      'Busca a ultima resposta de quiz vinculada ao capture_id e retorna todas as respostas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Respostas do quiz retornadas com sucesso.',
    type: CaptureQuizAnswersResponseDto,
  })
  async getQuizAnswers(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return await this.captureService.getCaptureQuizAnswers(id);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista registros da tabela capture',
    description:
      'Retorna registros paginados com filtros por periodo, launch, temperature e season.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'per_page', required: false, example: '50' })
  @ApiQuery({ name: 'start_date', required: false, example: '2026-02-01' })
  @ApiQuery({ name: 'end_date', required: false, example: '2026-02-29' })
  @ApiQuery({
    name: 'launch_id',
    required: false,
    example: '0b2f5687-2cdf-4d95-81f9-7e97d6f0d6d2',
  })
  @ApiQuery({
    name: 'temperature_id',
    required: false,
    example: '7b489f3a-e045-4b4e-857f-32544057c9ac',
  })
  @ApiQuery({
    name: 'season_id',
    required: false,
    example: 'f70d2c2f-31cb-4d66-8321-a18aa9f19e18',
  })
  @ApiQuery({
    name: 'quiz_answered',
    required: false,
    example: 'true',
    description: 'true para respondeu quiz, false para não respondeu.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de captures retornada com sucesso.',
    type: CaptureListResponseDto,
  })
  async list(@Query() query: ListCaptureQueryDto) {
    return await this.captureService.listCaptures(query);
  }

  private buildExportFileName(extension: 'csv' | 'xlsx') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `capture-export-${timestamp}.${extension}`;
  }
}
