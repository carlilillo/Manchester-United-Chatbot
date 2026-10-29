import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/** Reuse the shared API schemas instead of duplicating request contracts in controllers. */
export class SchemaValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return parsed.data;
  }
}
