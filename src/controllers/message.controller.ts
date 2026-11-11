import { NextFunction, Request, Response } from 'express';
import { MessageService } from '../services/message.service';
import { sendSuccess } from '../utils/response';

export class MessageController {
  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId } = req.params;
      const { senderId, text } = req.body;
      const message = await MessageService.sendMessage(chatId!, senderId, text);
      sendSuccess(res, message, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId } = req.params;
      const limit = req.query['limit'] ? Number(req.query['limit']) : 50;
      const cursor = req.query['cursor'] ? String(req.query['cursor']) : undefined;
      const userId = req.query['userId'] ? String(req.query['userId']) : undefined;

      const result = await MessageService.getMessages(chatId!, limit, cursor, userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async markMessageRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId, messageId } = req.params;
      const { userId } = req.body;
      const result = await MessageService.markMessageRead(chatId!, messageId!, userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async updateLastSeen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId } = req.params;
      const { userId, messageId } = req.body;
      const result = await MessageService.updateLastSeen(chatId!, userId, messageId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async editMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId, messageId } = req.params;
      const { userId, text } = req.body;
      const result = await MessageService.editMessage(chatId!, messageId!, userId, text);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId, messageId } = req.params;
      const { userId } = req.body;
      const result = await MessageService.deleteMessage(chatId!, messageId!, userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
