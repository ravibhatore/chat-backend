import { NextFunction, Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { sendSuccess } from '../utils/response';

export class ChatController {
  static async createDirectChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userAId, userBId } = req.body;
      const result = await ChatService.createOrGetDirectChat(userAId, userBId);
      const status = result.isNew ? 201 : 200;
      sendSuccess(res, result, status);
    } catch (err) {
      next(err);
    }
  }

  static async createGroupChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId, name, memberIds } = req.body;
      const result = await ChatService.createGroupChat(creatorId, name, memberIds);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  static async addMemberToGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId } = req.params;
      const { requesterId, userId } = req.body;
      const result = await ChatService.addMemberToGroup(requesterId, chatId!, userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async removeMemberFromGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId } = req.params;
      const { requesterId, userId } = req.body;
      const result = await ChatService.removeMemberFromGroup(requesterId, chatId!, userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
