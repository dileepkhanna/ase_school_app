import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((i) => `${i.path.join('.') || 'field'}: ${i.message}`)
        .join(', ');
      throw new BadRequestException(msg);
    }
    return parsed.data;
  }
}
