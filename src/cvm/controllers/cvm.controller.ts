import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { GetAllQuery } from '../queries';
import { RegisterCvmCommand } from '../commands';
import { Page } from '../../common/models';
import { CvmProjection } from '../models';
import { CvmPageDto, RegisterCvmDto } from './dtos';
import { GetAllCvmQueryDto } from './dtos/get-all-cvm-query.dto';

@Controller({ path: 'cvm', version: '1' })
export class CvmController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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
}
