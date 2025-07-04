import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { GetAllQuery, GetAllWithinQuery, GetByIdQuery } from 'src/cvm/queries';
import { InvalidImportFileError, Page } from 'src/common/models';
import { CvmProjection, CvmClusterProjection } from 'src/cvm/models';
import {
  CvmPageDto,
  GetAllCvmQueryDto,
  GetAllCvmWithinQueryDto,
  CvmClusterDto,
  CvmDto,
  ImportOsmDto,
  ImportManualDto,
} from './dtos';
import { JwtGuard } from 'src/common/controllers';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller({ path: '/kmc/cvms', version: '1' })
@UseGuards(JwtGuard)
export class CvmController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @InjectQueue('cvm-import') private cvmImportQueue: Queue,
  ) {}

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

  @Get()
  async getAll(@Query() queryParams: GetAllCvmQueryDto): Promise<CvmPageDto> {
    const { page, perPage } = queryParams;

    const pageable = {
      page: Number(page) || 0,
      perPage: Number(perPage) || 25,
    };
    const query = new GetAllQuery(pageable, queryParams.filter);

    const result = await this.queryBus.execute<
      GetAllQuery,
      Page<CvmProjection>
    >(query);

    return {
      content: result.content,
      info: result.info,
    };
  }

  @Get('/:id')
  async getById(@Param('id') id: string): Promise<CvmProjection> {
    const query = new GetByIdQuery(id);
    const result = await this.queryBus.execute<GetByIdQuery, CvmProjection>(
      query,
    );

    return result;
  }

  @Post('/import/manual')
  async import(@Body() body: ImportManualDto): Promise<void> {
    await this.cvmImportQueue.add('manual', {
      cvms: body.cvms,
    });
  }

  @Post('/import/file')
  @UseInterceptors(FileInterceptor('file'))
  async importFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'json',
        })
        .addMaxSizeValidator({
          maxSize: 10000,
        })
        .build({ exceptionFactory: () => new InvalidImportFileError() }),
    )
    file: Express.Multer.File,
  ) {
    await this.cvmImportQueue.add('file', {
      path: file.path,
      filename: file.filename,
      mimetype: file.mimetype,
      encoding: file.encoding,
    });
  }

  @Post('/import/osm')
  async importOsm(@Body() body: ImportOsmDto): Promise<void> {
    await this.cvmImportQueue.add('osm', {
      region: body.region,
    });
  }
}
