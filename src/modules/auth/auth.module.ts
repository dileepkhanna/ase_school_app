import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MailModule } from '../../integrations/mail/mail.module';
import { FirebaseModule } from '../../integrations/firebase/firebase.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { User } from '../users/entities/user.entity';
import { School } from '../schools/entities/school.entity';

import { AuthSession } from './entities/session.entity';
import { AuthOtp } from './entities/otp.entity';

import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    ConfigModule,
    MailModule,      // ✅ provides MailService
    FirebaseModule,  // ✅ provides FcmService

    TypeOrmModule.forFeature([User, School, AuthSession, AuthOtp]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('security.jwtAccessSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
