import { Controller, Get, Response } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { PoWService } from 'src/core/ident/services';

@Controller({ path: 'pow', version: '1' })
export class PoWController {
  constructor(private readonly powService: PoWService) {}

  @Get()
  async get(@Response() res: ExpressResponse): Promise<void> {
    const stamp = await this.powService.generateChallenge();

    res.header('X-PoW', stamp.toStamp()).send();
  }
}
