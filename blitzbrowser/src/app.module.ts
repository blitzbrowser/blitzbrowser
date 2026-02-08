import { Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { StatusController } from './controllers/status.controller';
import { UserDataService } from './services/user-data.service';
import { BrowserPoolService } from './services/browser-pool.service';
import { TimezoneService } from './services/timezone.service';
import { CDPWebSocketGateway } from './gateways/cdp.gateway';
import { VNCWebSocketGateway } from './gateways/vnc.gateway';
import { WebSocketGateway } from './gateways/websocket.gateway';
import { BrowserInstanceWebSocketGateway } from './gateways/browser-instance.gateway';
import { BrowserPoolController } from './controllers/browser-pool.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './guards/api-key.guard';

const USER_DATA_PROVIDERS = Object.keys(process.env).filter(k => k.startsWith('S3_')).length === 0 ? [] : [
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

  UserDataService,
]

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  controllers: [
    StatusController,
    BrowserPoolController,
  ],
  providers: [
    ApiKeyGuard,

    {
      provide: APP_GUARD,
      useExisting: ApiKeyGuard,
    },
    
    WebSocketGateway,
    CDPWebSocketGateway,
    VNCWebSocketGateway,
    BrowserInstanceWebSocketGateway,

    ...USER_DATA_PROVIDERS,

    TimezoneService,
    BrowserPoolService,
  ],
})
export class AppModule { }
