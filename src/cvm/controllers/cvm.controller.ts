import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { GetAllWithinQuery, GetByIdQuery } from '../queries';
import {
  RegisterCvmCommand,
  DownvoteCvmCommand,
  UpvoteCvmCommand,
  ReportCvmCommand,
} from '../commands';
import { CvmClusterProjection, CvmProjection } from '../models';
import {
  RegisterCvmDto,
  GetAllCvmWithinQueryDto,
  CvmDto,
  CvmClusterDto,
  DownvoteParamsDto,
  UpvoteParamsDto,
  DownvoteCvmDto,
  UpvoteCvmDto,
  GetCvmByIdParamsDto,
  RepositionParamsDto,
  RepositionCvmDto,
  ReportCvmDto,
  ReportParamsDto,
} from './dtos';
import { Identity, IdentGuard } from 'src/ident/controllers';
import { RepositionCvmCommand } from '../commands/reposition-cvm.command';

@Controller({ path: '/cvms', version: '1' })
export class CvmController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
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

    const query = new GetAllWithinQuery(
      bottomLeft,
      topRight,
      queryParams.zoom,
      queryParams.variant,
    );
    const result = await this.queryBus.execute<
      GetAllWithinQuery,
      (CvmProjection | CvmClusterProjection)[]
    >(query);

    return result;
  }

  @UseGuards(IdentGuard)
  @Post()
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
  @Patch('/:id')
  async reposition(
    @Param() params: RepositionParamsDto,
    @Identity() identity: string,
    @Body() body: RepositionCvmDto,
  ): Promise<void> {
    const command = new RepositionCvmCommand(
      params.id,
      body.repositionedLatitude,
      body.repositionedLongitude,
      body.editorLatitude,
      body.editorLongitude,
      identity,
    );

    await this.commandBus.execute<RepositionCvmCommand>(command);
  }

  @Get('/:id')
  async getById(@Param() params: GetCvmByIdParamsDto): Promise<CvmDto> {
    const query = new GetByIdQuery(params.id);
    const result = await this.queryBus.execute<GetByIdQuery, CvmProjection>(
      query,
    );

    return result;
  }

  @UseGuards(IdentGuard)
  @Post('/:id/downvote')
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
  @Post('/:id/upvote')
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

  @UseGuards(IdentGuard)
  @Post('/:id/report')
  async report(
    @Param() params: ReportParamsDto,
    @Identity() identity: string,
    @Body() body: ReportCvmDto,
  ): Promise<void> {
    const command = new ReportCvmCommand(
      params.id,
      body.longitude,
      body.latitude,
      identity,
      body.type,
    );

    await this.commandBus.execute<ReportCvmCommand>(command);
  }
}
