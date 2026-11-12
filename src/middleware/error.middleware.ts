import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.statusCode,
      success: false,
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  if (env.NODE_ENV !== 'test') {
    console.error('Error:', err.message || err);
  }

  res.status(500).json({
    code: 500,
    success: false,
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' ? { message: err.message } : {}),
  });
}
