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
import { GetAllWithinQuery } from '../queries';
import {
  RegisterCvmCommand,
  DownvoteCvmCommand,
  UpvoteCvmCommand,
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
} from './dtos';
import { Identity, IdentGuard } from 'src/ident/controllers';

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

    const query = new GetAllWithinQuery(bottomLeft, topRight, queryParams.zoom);
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
}
