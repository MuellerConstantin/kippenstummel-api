import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { CommonModule } from './common/common.module';
import { CvmModule } from './cvm/cvm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env.local',
        '.env',
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .required(),
        PORT: Joi.number().default(8080),
        MONGO_URI: Joi.string().uri().required(),
        REDIS_URI: Joi.string().uri().required(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    CommonModule,
    CvmModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
