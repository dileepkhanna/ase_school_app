import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';
import { User } from '../users/entities/user.entity';

import { NotificationsModule } from '../notifications/notifications.module';

import { BirthdaysService } from './birthdays.service';
import { BirthdaysController } from './birthdays.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherProfile, StudentProfile, User]),
    NotificationsModule,
  ],
  controllers: [BirthdaysController],
  providers: [BirthdaysService],
  exports: [BirthdaysService],
})
export class BirthdaysModule {}
