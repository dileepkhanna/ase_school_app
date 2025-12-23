import { PartialType } from '@nestjs/swagger';
import { CreateCircularDto } from './create-circular.dto';

export class UpdateCircularDto extends PartialType(CreateCircularDto) {}
