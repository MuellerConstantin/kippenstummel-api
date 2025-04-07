import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): { [key: string]: string } {
    return {
      version: '0.1.0',
    };
  }
}
