import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Recap } from './entities/recap.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { RecapsService } from './recaps.service';
import { RecapsController } from './recaps.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Recap, TeacherProfile, StudentProfile])],
  controllers: [RecapsController],
  providers: [RecapsService],
  exports: [RecapsService],
})
export class RecapsModule {}
