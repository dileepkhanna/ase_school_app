import { Module } from '@nestjs/common';

import { R2Module } from '../../integrations/r2/r2.module';

import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [R2Module],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
