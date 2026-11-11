import { NextFunction, Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email } = req.body;
      const user = await UserService.createUser(name, email);
      sendSuccess(res, user, 201, 'User created');
    } catch (err) {
      next(err);
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await UserService.getUserById(userId!);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  static async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserService.listUsers();
      sendSuccess(res, { users });
    } catch (err) {
      next(err);
    }
  }

  static async getUserChats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await ChatService.listUserChats(userId!);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
