import { Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { StatusController } from './controllers/status.controller';
import { UserDataS3Service, UserDataService } from './services/user-data.service';
import { BrowserPoolService } from './services/browser-pool.service';
import { TimezoneService } from './services/timezone.service';
import { CDPController } from './controllers/cdp.controller';

@Module({
  imports: [],
  controllers: [
    CDPController,
    StatusController,
  ],
  providers: [
    {
      provide: S3Client,
      useFactory: async () => {
        return new S3Client({
          region: 'auto',
          endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
          forcePathStyle: true,
        });
      }
    },
    {
      provide: UserDataService,
      useClass: UserDataS3Service,
    },

    BrowserPoolService,
    TimezoneService
  ],
})
export class AppModule { }
