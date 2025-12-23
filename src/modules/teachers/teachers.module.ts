import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';

import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, TeacherProfile])],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
