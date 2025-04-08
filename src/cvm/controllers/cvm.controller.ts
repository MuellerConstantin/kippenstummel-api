import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { GetAllQuery } from '../queries';
import { RegisterCvmCommand } from '../commands';
import { Page } from '../../common/models';
import { CvmProjection } from '../models';
import { CvmPageDto, RegisterCvmDto } from './dtos';

@Controller({ path: 'cvm', version: '1' })
export class CvmController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async open(@Body() body: RegisterCvmDto): Promise<void> {
    const command = new RegisterCvmCommand(body.longitude, body.latitude);

    await this.commandBus.execute<RegisterCvmCommand>(command);
  }

  @Get()
  async get(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<CvmPageDto> {
    const pageable =
      Number(page) && Number(perPage)
        ? { page: Number(page), perPage: Number(perPage) }
        : undefined;
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
