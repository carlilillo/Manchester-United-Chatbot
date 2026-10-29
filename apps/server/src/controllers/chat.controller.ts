import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { feedbackSchema, messageInputSchema } from '@united/contracts';
import type { z } from 'zod';
import { SessionUser } from '../decorators/session-user.decorator';
import { SchemaValidationPipe } from '../pipes/schema-validation.pipe';
import { ChatService } from '../services/chat.service';
import { RunService } from '../services/run.service';
import { createEventStream } from '../utils/event-stream';

@Controller('chats')
export class ChatController {
  constructor(
    private readonly chats: ChatService,
    private readonly runs: RunService,
  ) {}

  @Get()
  list(
    @SessionUser() userId: string,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.chats.list(userId, 30, Math.max(0, offset));
  }

  @Post()
  create(@SessionUser() userId: string) {
    return this.chats.create(userId);
  }

  @Get(':threadId/messages')
  async messages(
    @SessionUser() userId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
  ) {
    const chat = await this.chats.get(userId, threadId);
    return {
      threadId: chat.threadId,
      title: chat.title,
      messages: chat.messages,
      status: chat.status,
    };
  }

  @Patch(':threadId/messages/:messageId/feedback')
  feedback(
    @SessionUser() userId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body('feedback', new SchemaValidationPipe(feedbackSchema))
    feedback: z.infer<typeof feedbackSchema>,
  ) {
    return this.chats.feedback(userId, threadId, messageId, feedback);
  }

  /** POST streaming keeps the existing request body contract while declaring SSE headers with Nest. */
  @Post(':threadId/messages')
  @HttpCode(200)
  @Header('Content-Type', 'text/event-stream; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  async send(
    @SessionUser() userId: string,
    @Res() response: Response,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Body(new SchemaValidationPipe(messageInputSchema)) input: z.infer<typeof messageInputSchema>,
  ) {
    const stream = createEventStream(response);
    try {
      await this.runs.run(userId, threadId, input.text, input.requestId, stream);
      stream.close();
    } catch (error) {
      // Once streaming has started, close the response even if final persistence fails.
      if (response.headersSent) stream.close();
      throw error;
    } finally {
      stream.dispose();
    }
  }
}
