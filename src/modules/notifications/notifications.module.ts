import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FirebaseModule } from '../../integrations/firebase/firebase.module';

import { DeviceToken } from './entities/device-token.entity';
import { NotificationEntity } from './entities/notification.entity';

import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    FirebaseModule, // ✅ makes FcmService available here
    TypeOrmModule.forFeature([DeviceToken, NotificationEntity]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
