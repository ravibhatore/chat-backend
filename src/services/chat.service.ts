import { prisma } from '../config/database';
import { firestore } from '../config/firebase';
import { getCanonicalDirectKey } from '../utils/canonical';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { UserService } from './user.service';

export class ChatService {
  static async createOrGetDirectChat(userAId: string, userBId: string) {
    if (userAId === userBId) {
      throw new BadRequestError('Cannot start a chat with yourself');
    }

    await UserService.verifyUsersExist([userAId, userBId]);
    const canonicalKey = getCanonicalDirectKey(userAId, userBId);

    // Look for existing direct chat first
    const existing = await prisma.chat.findUnique({
      where: { canonicalKey },
      include: {
        members: { select: { userId: true } },
      },
    });

    if (existing) {
      return {
        chatId: existing.id,
        type: existing.type,
        isNew: false,
        memberIds: existing.members.map((m) => m.userId),
        createdAt: existing.createdAt,
      };
    }

    const created = await prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          type: 'direct',
          canonicalKey,
        },
      });

      await tx.chatMember.createMany({
        data: [
          { chatId: chat.id, userId: userAId, role: 'member' },
          { chatId: chat.id, userId: userBId, role: 'member' },
        ],
      });

      return chat;
    });

    return {
      chatId: created.id,
      type: created.type,
      isNew: true,
      memberIds: [userAId, userBId],
      createdAt: created.createdAt,
    };
  }

  static async createGroupChat(creatorId: string, name: string, memberIds: string[]) {
    const allMembers = [...new Set([creatorId, ...memberIds])];
    if (allMembers.length < 2) {
      throw new BadRequestError('Group chats require at least 2 unique members');
    }

    await UserService.verifyUsersExist(allMembers);

    const chat = await prisma.$transaction(async (tx) => {
      const created = await tx.chat.create({
        data: {
          type: 'group',
          name,
        },
      });

      await tx.chatMember.createMany({
        data: allMembers.map((userId) => ({
          chatId: created.id,
          userId,
          role: userId === creatorId ? 'admin' : 'member',
        })),
      });

      return created;
    });

    return {
      chatId: chat.id,
      type: chat.type,
      name: chat.name,
      memberIds: allMembers,
      createdAt: chat.createdAt,
    };
  }

  static async verifyMembership(chatId: string, userId: string) {
    const member = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: { chatId, userId },
      },
    });

    if (!member) {
      const chat = await prisma.chat.findUnique({ where: { id: chatId } });
      if (!chat) {
        throw new NotFoundError(`Chat ${chatId} does not exist`);
      }
      throw new ForbiddenError(`User is not a member of chat ${chatId}`);
    }

    return member;
  }

  static async listUserChats(userId: string) {
    await UserService.getUserById(userId);

    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const chats = await Promise.all(
      memberships.map(async (m) => {
        const { chat } = m;
        const memberIds = chat.members.map((mem) => mem.userId);

        let lastMessage = null;

        try {
          const snapshot = await firestore
            .collection('chats')
            .doc(chat.id)
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const doc = snapshot.docs[0]!;
            const data = doc.data();
            const date = data['createdAt']?.toDate?.() ?? new Date();
            lastMessage = {
              messageId: doc.id,
              senderId: data['senderId'] ?? '',
              text: data['isDeleted'] ? 'This message was deleted' : data['text'] ?? '',
              createdAt: date.toISOString(),
            };
          }
        } catch {
          // If firestore index is compiling or query fails, leave preview as null
        }

        return {
          chatId: chat.id,
          type: chat.type,
          name: chat.name,
          memberIds,
          members: chat.members.map((mem) => mem.user),
          createdAt: chat.createdAt.toISOString(),
          lastMessage,
        };
      })
    );

    return { chats };
  }

  static async addMemberToGroup(requesterId: string, chatId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      throw new NotFoundError(`Chat ${chatId} not found`);
    }

    if (chat.type !== 'group') {
      throw new BadRequestError('Cannot add members to a 1:1 chat');
    }

    const isMember = chat.members.some((m) => m.userId === requesterId);
    if (!isMember) {
      throw new ForbiddenError('Only existing members can invite someone');
    }

    await UserService.getUserById(userId);

    const alreadyMember = chat.members.some((m) => m.userId === userId);
    if (alreadyMember) {
      throw new BadRequestError('User is already in this chat');
    }

    return prisma.chatMember.create({
      data: { chatId, userId, role: 'member' },
    });
  }

  static async removeMemberFromGroup(requesterId: string, chatId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      throw new NotFoundError(`Chat ${chatId} not found`);
    }

    if (chat.type !== 'group') {
      throw new BadRequestError('Cannot remove members from a 1:1 chat');
    }

    const requester = chat.members.find((m) => m.userId === requesterId);
    if (!requester) {
      throw new ForbiddenError('Only chat members can perform this action');
    }

    if (requesterId !== userId && requester.role !== 'admin') {
      throw new ForbiddenError('Only group admins can remove other members');
    }

    const target = chat.members.find((m) => m.userId === userId);
    if (!target) {
      throw new NotFoundError('Target user is not in this chat');
    }

    await prisma.chatMember.delete({
      where: {
        chatId_userId: { chatId, userId },
      },
    });

    return { removedUserId: userId, chatId };
  }
}
