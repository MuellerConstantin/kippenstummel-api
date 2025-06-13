import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { CommonModule } from './common/common.module';
import { CvmModule } from './cvm/cvm.module';
import { IdentModule } from './ident/ident.module';
import { KmcModule } from './kmc/kmc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env.local',
        '.env',
        `${process.env.CONFIG_DIR || './config'}/.env.${process.env.NODE_ENV}.local`,
        `${process.env.CONFIG_DIR || './config'}/.env.${process.env.NODE_ENV}`,
        `${process.env.CONFIG_DIR || './config'}/.env.local`,
        `${process.env.CONFIG_DIR || './config'}/.env`,
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'staging')
          .required(),
        PORT: Joi.number().default(8080),
        MONGO_URI: Joi.string().uri().required(),
        REDIS_URI: Joi.string().uri().required(),
        OAUTH2_KEY_PATH: Joi.string().required(),
        POW_DIFFICULTY: Joi.number().default(20),
        POW_EXPIRES_IN: Joi.number().default(60 * 5),
        IDENT_SECRET: Joi.string().required(),
        IDENT_EXPIRES_IN: Joi.number().default(60 * 60 * 24 * 7),
        CAPTCHA_EXPIRES_IN: Joi.number().default(60 * 5),
        TRANSFER_EXPIRES_IN: Joi.number().default(60 * 5),
        TMP_DIR: Joi.string().required(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    CommonModule,
    CvmModule,
    IdentModule,
    KmcModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
