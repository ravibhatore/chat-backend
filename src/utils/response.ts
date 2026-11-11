import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string
): Response {
  const payload: Record<string, unknown> = {
    success: true,
  };

  if (message) {
    payload['message'] = message;
  }

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    Object.assign(payload, data);
  } else {
    payload['data'] = data;
  }

  return res.status(statusCode).json(payload);
}
