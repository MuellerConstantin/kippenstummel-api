import {
  Body,
  Controller,
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
import { Page } from 'src/common/models';
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
  DownvoteCvmDto,
  UpvoteCvmDto,
} from './dtos';
import { IdentGuard, OAuth2Guard, Identity } from 'src/common/controllers';

@Controller({ version: '1' })
export class CvmController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('cvms')
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

  @UseGuards(IdentGuard)
  @Post('cvms')
  async register(
    @Body() body: RegisterCvmDto,
    @Identity() identity: string,
  ): Promise<void> {
    const command = new RegisterCvmCommand(
      body.longitude,
      body.latitude,
      identity,
    );

    await this.commandBus.execute<RegisterCvmCommand>(command);
  }

  @UseGuards(IdentGuard)
  @Post('cvms/:id/downvote')
  async downvote(
    @Param() params: DownvoteParamsDto,
    @Identity() identity: string,
    @Body() body: DownvoteCvmDto,
  ): Promise<void> {
    const command = new DownvoteCvmCommand(
      params.id,
      body.longitude,
      body.latitude,
      identity,
    );

    await this.commandBus.execute<DownvoteCvmCommand>(command);
  }

  @UseGuards(IdentGuard)
  @Post('cvms/:id/upvote')
  async upvote(
    @Param() params: UpvoteParamsDto,
    @Identity() identity: string,
    @Body() body: UpvoteCvmDto,
  ): Promise<void> {
    const command = new UpvoteCvmCommand(
      params.id,
      body.longitude,
      body.latitude,
      identity,
    );

    await this.commandBus.execute<UpvoteCvmCommand>(command);
  }

  @UseGuards(OAuth2Guard)
  @Get('kmc/cvms')
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
  @Post('kmc/cvms')
  async import(@Body() body: ImportCvmsDto): Promise<void> {
    const command = new ImportCvmsCommand(body.cvms);

    await this.commandBus.execute<ImportCvmsCommand>(command);
  }
}
