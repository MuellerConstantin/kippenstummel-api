import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { GetAllQuery, GetAllWithinQuery } from '../queries';
import { RegisterCvmCommand } from '../commands';
import { Page } from '../../common/models';
import { CvmClusterProjection, CvmProjection } from '../models';
import {
  CvmPageDto,
  RegisterCvmDto,
  GetAllCvmQueryDto,
  GetAllCvmWithinQueryDto,
  CvmDto,
  CvmClusterDto,
} from './dtos';
import { IdentGuard } from '../../common/controllers';

@Controller({ path: 'cvm', version: '1' })
export class CvmController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @UseGuards(IdentGuard)
  @Post()
  async register(@Body() body: RegisterCvmDto): Promise<void> {
    const command = new RegisterCvmCommand(body.longitude, body.latitude);

    await this.commandBus.execute<RegisterCvmCommand>(command);
  }

  @Get()
  async getAll(@Query() queryParams: GetAllCvmQueryDto): Promise<CvmPageDto> {
    const { page, perPage } = queryParams;

    const pageable = {
      page: Number(page) || 0,
      perPage: Number(perPage) || 25,
    };
    const query = new GetAllQuery(pageable);

    const result = await this.queryBus.execute<
      GetAllQuery,
      Page<CvmProjection>
    >(query);

    return {
      content: result.content,
      info: result.info,
    };
  }

  @Get('/within')
  async getAllWithin(
    @Query() queryParams: GetAllCvmWithinQueryDto,
  ): Promise<(CvmDto | CvmClusterDto)[]> {
    const bottomLeft = {
      longitude: queryParams.bottomLeftCoordinates[0],
      latitude: queryParams.bottomLeftCoordinates[1],
    };
    const topRight = {
      longitude: queryParams.topRightCoordinates[0],
      latitude: queryParams.topRightCoordinates[1],
    };

    const query = new GetAllWithinQuery(bottomLeft, topRight, queryParams.zoom);
    const result = await this.queryBus.execute<
      GetAllWithinQuery,
      (CvmProjection | CvmClusterProjection)[]
    >(query);

    return result;
  }
}
