import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ListTemperatureItemDto } from './dto/list-temperature-response.dto';
import { TemperatureService } from './temperature.service';

@ApiTags('Temperature')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard)
@Controller('temperature')
export class TemperatureController {
  constructor(private readonly temperatureService: TemperatureService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista temperaturas',
    description: 'Retorna todos os registros da tabela temperature.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de temperatures retornada com sucesso.',
    type: ListTemperatureItemDto,
    isArray: true,
  })
  async listAll(): Promise<ListTemperatureItemDto[]> {
    return await this.temperatureService.listAll();
  }
}
