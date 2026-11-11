import { Request, Response, Router } from 'express';
import { prisma } from '../config/database';
import { firestore } from '../config/firebase';
import chatRoutes from './chat.routes';
import userRoutes from './user.routes';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  let postgres = 'connected';
  let firestoreStatus = 'connected';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    postgres = `disconnected: ${(err as Error).message}`;
  }

  try {
    await firestore.listCollections();
  } catch (err) {
    firestoreStatus = `disconnected: ${(err as Error).message}`;
  }

  const ok = postgres === 'connected' && firestoreStatus === 'connected';

  res.status(ok ? 200 : 503).json({
    status: ok ? 'healthy' : 'degraded',
    services: {
      postgres,
      firestore: firestoreStatus,
    },
  });
});

router.use('/user', userRoutes);
router.use('/chat', chatRoutes);

export default router;
