import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import {
  DefaultExceptionFilter,
  HttpExceptionFilter,
  ApiExceptionFilter,
  JwtStrategy,
  JwtGuard,
} from './controllers';
import { InvalidPayloadError } from 'src/lib/models/error';
import { ValidationError } from 'class-validator';
import { MulterModule } from '@nestjs/platform-express';
import multer from 'multer';
import { SecurityInfrastructureModule } from 'src/infrastructure/security/security.infrastructure.module';

@Module({
  imports: [
    SecurityInfrastructureModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        storage: multer.diskStorage({
          destination: (req, file, cb) => {
            cb(null, configService.get<string>('TMP_DIR')!);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const extension = file.originalname.split('.').pop();
            cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
          },
        }),
      }),
      inject: [ConfigService],
    }),
    PassportModule,
  ],
  controllers: [],
  providers: [
    DefaultExceptionFilter,
    HttpExceptionFilter,
    ApiExceptionFilter,
    JwtStrategy,
    JwtGuard,
    {
      provide: ValidationPipe,
      useValue: new ValidationPipe({
        transform: true,
        stopAtFirstError: true,
        exceptionFactory: (errors) => {
          const flattenValidationErrors = (
            errors: ValidationError[],
            parentPath = '',
          ): Array<{
            property: string;
            constraint: string;
            message: string;
          }> => {
            const result: Array<{
              property: string;
              constraint: string;
              message: string;
            }> = [];

            for (const error of errors) {
              const propertyPath = parentPath
                ? `${parentPath}.${error.property}`
                : error.property;

              if (error.constraints) {
                const constraints = Object.entries(error.constraints);

                for (const constraint of constraints) {
                  const name = constraint[0];
                  const message = constraint[1];

                  result.push({
                    property: propertyPath,
                    constraint: name,
                    message,
                  });
                }
              }

              if (error.children?.length) {
                result.push(
                  ...flattenValidationErrors(error.children, propertyPath),
                );
              }
            }

            return result;
          };

          const flatErrors = flattenValidationErrors(errors);
          return new InvalidPayloadError(flatErrors);
        },
      }),
    },
  ],
  exports: [MulterModule],
})
export class CommonPresentationModule {}
