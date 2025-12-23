import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Circular } from './entities/circular.entity';
import { CircularReadState } from './entities/circular-read-state.entity';

import { CircularsService } from './circulars.service';
import { CircularsController } from './circulars.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Circular, CircularReadState])],
  controllers: [CircularsController],
  providers: [CircularsService],
  exports: [CircularsService],
})
export class CircularsModule {}
