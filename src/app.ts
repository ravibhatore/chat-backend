import cors from 'cors';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import routes from './routes';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/', (_req: Request, res: Response) => {
    res.json({ code: 200, message: 'Chat API is running', docs: '/api/health' });
  });

  app.use('/api', routes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ code: 404, success: false, error: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}