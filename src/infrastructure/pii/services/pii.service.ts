import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PiiToken as PiiTokenModel } from '../repositories';

@Injectable()
export class PiiService {
  constructor(
    @InjectModel(PiiTokenModel.name)
    private readonly piiTokenModel: Model<PiiTokenModel>,
  ) {}

  async tokenizePii(authority: string, data: any): Promise<string> {
    const token = crypto.randomBytes(16).toString('hex');

    await this.piiTokenModel.create({
      authority,
      token,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
    });

    return token;
  }

  async untokenizePii(token: string): Promise<any> {
    const result = await this.piiTokenModel.findOne({ token });

    return result?.data || null;
  }
}
