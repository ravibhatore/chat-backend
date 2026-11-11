import { prisma } from '../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';

export class UserService {
  static async createUser(name: string, email: string) {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictError(`User with email "${email}" already exists`);
    }

    return prisma.user.create({
      data: { name, email },
    });
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError(`User ${id} not found`);
    }

    return user;
  }

  static async listUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  static async verifyUsersExist(userIds: string[]) {
    const unique = [...new Set(userIds)];
    const existing = await prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((u) => u.id));
    const missing = unique.filter((id) => !existingIds.has(id));

    if (missing.length > 0) {
      throw new BadRequestError(`Users do not exist: ${missing.join(', ')}`);
    }
  }
}
