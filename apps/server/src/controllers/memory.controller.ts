import { BadRequestException, Body, ConflictException, Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { memoryInputSchema } from '@united/contracts';
import { SessionService } from '../services/session.service';
import { VectorService } from '../vector/vector.service';
@Controller('memory')
export class MemoryController {
  constructor(private readonly sessions: SessionService, private readonly vectors: VectorService) {}
  @Get() get(@Req() req: Request) { return this.vectors.getMemory(this.sessions.requireUser(req)); }
  @Put() async save(@Req() req: Request, @Body() body: unknown) {
    const parsed = memoryInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const input = parsed.data;
    try { return await this.vectors.saveMemory(this.sessions.requireUser(req), input); }
    catch (error) { if ((error as Error).message === 'MEMORY_VERSION_CONFLICT') throw new ConflictException('Memory changed in another tab'); throw error; }
  }
}
