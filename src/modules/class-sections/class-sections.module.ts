import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassSection } from './entities/class-section.entity';
import { ClassSectionsController } from './class-sections.controller';
import { ClassSectionsService } from './class-sections.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClassSection])],
  controllers: [ClassSectionsController],
  providers: [ClassSectionsService],
  exports: [ClassSectionsService],
})
export class ClassSectionsModule {}
