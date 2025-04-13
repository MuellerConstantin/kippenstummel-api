import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { GetAllQuery, GetAllWithinQuery } from '../queries';
import { RegisterCvmCommand } from '../commands';
import { Page } from '../../common/models';
import { CvmProjection } from '../models';
import {
  CvmPageDto,
  RegisterCvmDto,
  GetAllCvmQueryDto,
  GetAllCvmWithinQueryDto,
  CvmDto,
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
  ): Promise<CvmDto[]> {
    const { bottomLeftLon, bottomLeftLat, topRightLon, topRightLat } =
      queryParams;
    const bottomLeft = { longitude: bottomLeftLon, latitude: bottomLeftLat };
    const topRight = { longitude: topRightLon, latitude: topRightLat };

    const query = new GetAllWithinQuery(bottomLeft, topRight);
    const result = await this.queryBus.execute<
      GetAllWithinQuery,
      CvmProjection[]
    >(query);

    return result;
  }
}
