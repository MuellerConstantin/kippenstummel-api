import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { GetAllQuery, GetAllWithinQuery } from '../queries';
import {
  RegisterCvmCommand,
  DownvoteCvmCommand,
  UpvoteCvmCommand,
  ImportCvmsCommand,
} from '../commands';
import { Page } from '../../common/models';
import { CvmClusterProjection, CvmProjection } from '../models';
import {
  CvmPageDto,
  RegisterCvmDto,
  GetAllCvmQueryDto,
  GetAllCvmWithinQueryDto,
  CvmDto,
  CvmClusterDto,
  DownvoteParamsDto,
  UpvoteParamsDto,
  ImportCvmsDto,
} from './dtos';
import { IdentGuard, OAuth2Guard } from '../../common/controllers';

@Controller({ version: '1' })
export class CvmController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @UseGuards(IdentGuard)
  @Post('cvm')
  async register(@Body() body: RegisterCvmDto): Promise<void> {
    const command = new RegisterCvmCommand(body.longitude, body.latitude);

    await this.commandBus.execute<RegisterCvmCommand>(command);
  }

  @UseGuards(IdentGuard)
  @Delete('cvm/:id')
  async downvote(@Param() params: DownvoteParamsDto): Promise<void> {
    const command = new DownvoteCvmCommand(params.id);

    await this.commandBus.execute<DownvoteCvmCommand>(command);
  }

  @UseGuards(IdentGuard)
  @Post('cvm/:id')
  async upvote(@Param() params: UpvoteParamsDto): Promise<void> {
    const command = new UpvoteCvmCommand(params.id);

    await this.commandBus.execute<UpvoteCvmCommand>(command);
  }

  @UseGuards(OAuth2Guard)
  @Get('kmc/cvm')
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

  @UseGuards(OAuth2Guard)
  @Post('kmc/cvm')
  async import(@Body() body: ImportCvmsDto): Promise<void> {
    const command = new ImportCvmsCommand(body.cvms);

    await this.commandBus.execute<ImportCvmsCommand>(command);
  }

  @Get('cvm/within')
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
