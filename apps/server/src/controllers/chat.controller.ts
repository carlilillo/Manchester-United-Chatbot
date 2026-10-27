import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { feedbackSchema, messageInputSchema } from '@united/contracts';
import { SessionService } from '../services/session.service';
import { ChatService } from '../services/chat.service';
import { RunService } from '../services/run.service';
@Controller('chats')
export class ChatController {
  constructor(private readonly sessions: SessionService, private readonly chats: ChatService, private readonly runs: RunService) {}
  @Get() list(@Req() req: Request, @Query('offset') rawOffset?: string) { return this.chats.list(this.sessions.requireUser(req), 30, Math.max(0, Number(rawOffset) || 0)); }
  @Post() create(@Req() req: Request) { return this.chats.create(this.sessions.requireUser(req)); }
  @Get(':threadId/messages') async messages(@Req() req: Request, @Param('threadId', ParseUUIDPipe) threadId: string) {
    const chat = await this.chats.get(this.sessions.requireUser(req), threadId);
    return { threadId: chat.threadId, title: chat.title, messages: chat.messages, status: chat.status };
  }
  @Patch(':threadId/messages/:messageId/feedback') feedback(@Req() req: Request, @Param('threadId', ParseUUIDPipe) threadId: string, @Param('messageId', ParseUUIDPipe) messageId: string, @Body() body: unknown) {
    const parsed = feedbackSchema.safeParse((body as { feedback?: unknown })?.feedback);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const value = parsed.data;
    return this.chats.feedback(this.sessions.requireUser(req), threadId, messageId, value);
  }
  @Post(':threadId/messages') async send(@Req() req: Request, @Res() res: Response, @Param('threadId', ParseUUIDPipe) threadId: string, @Body() body: unknown) {
    const parsed = messageInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const input = parsed.data;
    const userId = this.sessions.requireUser(req);
    await this.runs.run(userId, threadId, input.text, input.requestId, res);
  }
}
