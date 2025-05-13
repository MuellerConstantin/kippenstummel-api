import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { GetAllQuery } from 'src/cvm/queries';
import { ImportCvmsCommand } from 'src/cvm/commands';
import { Page } from 'src/common/models';
import { CvmProjection } from 'src/cvm/models';
import { CvmPageDto, GetAllCvmQueryDto, ImportCvmsDto } from './dtos';
import { OAuth2Guard } from 'src/common/controllers';

@Controller({ path: '/kmc/cvms', version: '1' })
@UseGuards(OAuth2Guard)
export class CvmController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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

  @Post()
  async import(@Body() body: ImportCvmsDto): Promise<void> {
    const command = new ImportCvmsCommand(body.cvms);

    await this.commandBus.execute<ImportCvmsCommand>(command);
  }
}
