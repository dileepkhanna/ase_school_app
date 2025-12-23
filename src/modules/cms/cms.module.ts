import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StaticPage } from './entities/static-page.entity';
import { SchoolPage } from './entities/school-page.entity';

import { CmsService } from './cms.service';
import { CmsController } from './cms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StaticPage, SchoolPage])],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
