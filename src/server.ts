import { createApp } from './app';
import { prisma } from './config/database';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing server...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error('Error disconnecting from database:', err);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
