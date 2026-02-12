import { Controller, Get, Query, Response } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { PoWService } from 'src/core/ident/services';
import { GetPoWQueryDto } from './dtos';

@Controller({ path: 'pow', version: '1' })
export class PoWController {
  constructor(private readonly powService: PoWService) {}

  @Get()
  async get(
    @Response() res: ExpressResponse,
    @Query() queryParams: GetPoWQueryDto,
  ): Promise<void> {
    const stamp = await this.powService.generateChallenge(queryParams.scope);

    res.header('X-PoW', stamp.toStamp()).send();
  }
}
