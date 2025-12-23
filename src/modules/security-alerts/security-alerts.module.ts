import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecurityAlert } from './entities/security-alert.entity';
import { SecurityAlertsService } from './security-alerts.service';
import { SecurityAlertsController } from './security-alerts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityAlert])],
  controllers: [SecurityAlertsController],
  providers: [SecurityAlertsService],
  exports: [SecurityAlertsService],
})
export class SecurityAlertsModule {}
