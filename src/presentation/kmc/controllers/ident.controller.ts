import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/presentation/common/controllers';
import { GetAllIdentQueryDto, IdentInfoDto, IdentPageDto } from './dtos';
import { IdentService } from 'src/core/ident/services';

@Controller({ path: '/kmc/ident', version: '1' })
@UseGuards(JwtGuard)
export class IdentController {
  constructor(private readonly identService: IdentService) {}

  @Get()
  async getAll(
    @Query() queryParams: GetAllIdentQueryDto,
  ): Promise<IdentPageDto> {
    const { page, perPage } = queryParams;

    const pageable = {
      page: Number(page) || 0,
      perPage: Number(perPage) || 25,
    };

    const result = await this.identService.getIdentities(
      pageable,
      queryParams.filter,
    );

    return {
      content: result.content,
      info: result.info,
    };
  }

  @Get('/:id')
  async getById(@Param('id') id: string): Promise<IdentInfoDto> {
    const result = await this.identService.getIdentity(id);
    return result;
  }

  @Delete('/:id')
  async deleteById(@Param('id') id: string): Promise<void> {
    await this.identService.unregisterIdentity(id);
  }
}
