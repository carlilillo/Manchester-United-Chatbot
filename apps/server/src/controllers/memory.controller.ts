import { Body, Controller, Get, Put } from '@nestjs/common';
import { memoryInputSchema, type MemoryInput } from '@united/contracts';
import { SessionUser } from '../decorators/session-user.decorator';
import { SchemaValidationPipe } from '../pipes/schema-validation.pipe';
import { VectorService } from '../vector/vector.service';

@Controller('memory')
export class MemoryController {
  constructor(private readonly vectors: VectorService) {}

  @Get()
  get(@SessionUser() userId: string) {
    return this.vectors.getMemory(userId);
  }

  @Put()
  save(
    @SessionUser() userId: string,
    @Body(new SchemaValidationPipe(memoryInputSchema)) input: MemoryInput,
  ) {
    return this.vectors.saveMemory(userId, input);
  }
}
